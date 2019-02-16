require('events').EventEmitter.defaultMaxListeners = 100;

const chalk = require('chalk');
const chokidar = require('chokidar');
const execa = require('execa');
const debounce = require('lodash.debounce');
const path = require('path');
const StreamSnitch = require('stream-snitch');
const { LineStream } = require('byline');
const { Transform } = require('stream');

const {
    logger,
    logoEmoji,
    tasks
} = require('../packages/pwa-buildpack/dist/Utilities/logging');

const watchAllPrefix = logoEmoji(9881); // gear

const log = logger(watchAllPrefix);

const gracefulExit = () => {
    console.log('\n');
    log.info('Exited watch mode.');
    process.exit(0);
};

process.on('SIGINT', gracefulExit);

function afterEmit(childProcess, regex, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(resolve, timeout);
        const snitch = new StreamSnitch(regex);
        snitch.on('match', () => {
            clearTimeout(timeoutId);
            resolve();
        });
        childProcess.stdout.pipe(snitch);
        childProcess.stderr.pipe(snitch);
        childProcess.on('error', reject);
    });
}

function whenQuiet(childProcess, timeout = 1000) {
    return new Promise((resolve, reject) => {
        childProcess.on('error', reject);
        childProcess.on(
            'close',
            code =>
                code === 0 ||
                log.error(
                    `Build watch process ${
                        childProcess.pid
                    } exited abnormally, code ${code}`
                )
        );

        // wait until stdout is quiet for a while before resolving this promise.
        const resolveDebounced = debounce(() => {
            // emit stderr so if the process exits abnormally, the error
            // displays in console
            childProcess.stderr.on('data', () => resolveDebounced());
            childProcess.stderr.pipe(process.stderr);
            resolve();
        }, timeout);
        childProcess.stdout.on('data', () => resolveDebounced());
    });
}

const rootDir = path.resolve(__dirname, '..');

const localDir = path.join(rootDir, 'node_modules/.bin');

const mustWatch = ['@magento/pwa-buildpack', '@magento/peregrine'];

const restartDevServerOnChange = [
    'packages/pwa-buildpack/dist/**/*.js',
    'packages/upward-js/lib/**/*.js',
    'packages/venia-concept/*.{js,json,yml}',
    'packages/venia-concept/.env',
    'packages/venia-concept/templates/**/*',
    'yarn.lock'
];

const jobs = tasks('Building', watchAllPrefix);
mustWatch.forEach(jobs.start);

const eventBuffer = [];

function summarizeEvents() {
    const typeMap = eventBuffer.reduce(
        (summaries,
        ({ name }) => {
            summaries[name] = (summaries[name] || 0) + 1;
        },
        {})
    );

    return Object.entries(typeMap).map(([name, value]) => ({
        name,
        file: `${value} files`
    }));
}

// For consistency and readability, replace the webpack-log prefixes in
// webpack-dev-server and webpack-dev-middleware output with the logger output
function prettifyWebpackLogs() {
    const webpackPrefix = /^.*?wd[sm].*?:\s*/;
    const lines = new LineStream();
    const xform = new Transform({
        transform(data, _, done) {
            const line = data.toString('utf8');
            const match = line.match(webpackPrefix);
            if (match) {
                log.bundle(line.slice(match[0].length));
            } else {
                this.push(line);
            }
            done();
        }
    });
    return lines.pipe(xform);
}

let devServer;
function startDevServer() {
    eventBuffer.length = 0;
    devServer = execa(
        'webpack-dev-server',
        ['--stdin', '--no-progress', '--color', '--env.mode', 'development'],
        {
            env: Object.assign({}, process.env, {
                CLI_WIDTH: process.stdout.columns,
                FORCE_COLOR: process.env.NO_COLOR ? '' : 1
            }),
            cwd: path.join(rootDir, 'packages/venia-concept'),
            localDir: path.join(rootDir, 'node_modules/.bin')
        }
    );
    devServer.on('exit', () => {
        devServer.exited = true;
    });
    devServer.stdout.pipe(prettifyWebpackLogs()).pipe(process.stdout);
    devServer.stderr.pipe(prettifyWebpackLogs()).pipe(process.stderr);
    afterEmit(devServer, /Compiled successfully/)
        .then(() => whenQuiet(devServer, 3000))
        .then(() => log.info('Press CTRL-C to exit.'))
        .catch(e => {
            log.error('Could not setup devServer', e);
        });
}

let isClosing = false;
const runVeniaWatch = debounce(() => {
    if (!devServer) {
        return startDevServer();
    }
    const fileSummary =
        eventBuffer.length > 20 ? summarizeEvents() : eventBuffer;
    log.watch(
        `Relaunching webpack-dev-server due to: \n  - ${fileSummary
            .map(
                ({ name, file }) =>
                    `${chalk.yellow(name)} ${chalk.whiteBright(file)}`
            )
            .join('\n  - ')}\n`
    );
    if (devServer.exited) {
        return startDevServer();
    }
    if (!isClosing) {
        devServer.on('close', () => {
            isClosing = false;
            devServer = false;
            startDevServer();
        });
        isClosing = true;
        devServer.kill();
    }
}, 800);

function runOnPackages(packages, cmd) {
    const scopeArg =
        packages.length > 1 ? `{${packages.join(',')}}` : packages[0];
    return execa(
        'lerna',
        ['--loglevel=error', '--stream', `--scope=${scopeArg}`, 'run', cmd],
        {
            localDir
        }
    );
}

function watchDependencies() {
    return whenQuiet(runOnPackages(mustWatch, 'watch'))
        .then(() => mustWatch.forEach(dep => jobs.succeed(dep)))
        .catch(e => {
            mustWatch.forEach(dep => jobs.error(dep));
            throw e;
        });
}

function watchRestartRequirements() {
    return chokidar.watch(restartDevServerOnChange, {
        ignored: '**/__*__/**/*'
    });
}

function watchVeniaWithRestarts() {
    jobs.start('PWADevServer');
    const eventsToListenTo = ['add', 'change', 'unlink'];
    const watcher = watchRestartRequirements();
    const enqueue = (name, file) => {
        eventBuffer.push({ name, file });
        runVeniaWatch();
    };
    // chokidar appears not to have `.removeEventListener`, so this is the next
    // best thing: just reassign functions.
    let handler = debounce(() => {
        jobs.succeed('PWADevServer');
        handler = enqueue;
        runVeniaWatch();
    }, 900);

    eventsToListenTo.forEach(name =>
        watcher.on(name, file => handler(name, file))
    );
}

watchDependencies()
    .catch(e => {
        log.error('while building dependencies', e);
        process.exit(1);
    })
    .then(watchVeniaWithRestarts)
    .catch(e => {
        log.error('while watching Venia files', e);
        process.exit(1);
    });
