/* istanbul ignore */
const signale = require('signale');
const signaleTypes = require('signale/types');
const figures = require('figures');
const chalk = require('chalk');
const cliFormat = require('cli-format');
const cliWidth = require('cli-width');
const { dots, line } = require('cli-spinners');

// Estimations of signale format's visual width, based on ANSI codes.
const CLI_FORMAT_ANSI_ADDITIONS = 8;
const SIGNALE_PREAMBLE_LENGTH = 9;
const RIGHT_PADDING = 1;

const getTermWidth = () => cliWidth({ defaultWidth: 80 });
const spaces = length => Array.from({ length }, () => ' ').join('');
const padRight = (str, toLen) =>
    str.length < toLen ? str + spaces(toLen - str.length) : str;

const emoji = codePoint => String.fromCodePoint(codePoint);
// Add a space for terms that display double-length emoji badly
// (i'm looking at you, iTerm)
const logoEmoji = codePoint => emoji(codePoint) + ' ';

const icons =
    process.platform === 'win32'
        ? {
              ready: figures.play,
              buildpack: 'BP',
              bundle: figures.hamburger,
              lock: figures.hamburger,
              spinFrames: line
          }
        : {
              ready: figures.play,
              buildpack: logoEmoji(129520), // toolbox
              bundle: emoji(128230), // package
              lock: emoji(128272), // lock and key
              spinFrames: dots
          };
const typeEntries = Object.entries({
    ...signaleTypes,
    // Add a few useful types
    secure: {
        badge: icons.lock,
        color: 'cyanBright',
        label: 'secure'
    },
    ready: {
        badge: icons.ready,
        color: 'greenBright',
        label: 'ready'
    },
    bonus: {
        badge: figures.star,
        color: 'yellowBright',
        label: 'bonus'
    },
    bundle: {
        badge: icons.bundle,
        color: 'cyanBright',
        label: 'bundle'
    }
});

// We'll use this to normalize label length for pretty output.
const maxLabelLength = Math.max(
    ...typeEntries.map(([, { label }]) => label.length)
);

// Reconstitute the types object, destructuring it to remove references
// to the base signale instance, and also normalizing label length.
const types = typeEntries.reduce(
    (types, [type, typeConfig]) => ({
        ...types,
        [type]: {
            ...typeConfig,
            label: padRight(typeConfig.label, maxLabelLength)
        }
    }),
    {}
);
// Always log with a prefix! The blank 'log' method should be aliased.
types.log = types.note;

// We want the original word break from the cliFormat.wrap() output which pads
// the left, but for the first line, we want to replace the padding with the
// preamble from signale.
const trimLeftToOriginalStr = (padded, original, maxLength, fallbackLength) => {
    // Get the tip of the original string, which should not have been word
    // wrapped by cliFormat.wrap. In case the first line has no spaces, stop
    // before being wrapped (with a little margin for error)
    const firstWord = original.slice(
        0,
        Math.max(original.indexOf(' '), maxLength - 5)
    );
    const originalIndex = padded.indexOf(firstWord);
    const trimPoint = originalIndex !== -1 ? originalIndex : fallbackLength;
    return padded.slice(trimPoint);
};

const cache = new Map();

function logger(scope = icons.buildpack, output = process.stdout) {
    const scopeCache =
        cache.get(scope) || cache.set(scope, new WeakMap()).get(scope);
    if (scopeCache.has(output)) {
        return scopeCache.get(output);
    }
    const loggerInstance = new signale.Signale({
        config: {
            underlineLabel: false
        },
        stream: output,
        scope,
        types
    });

    const format = {
        ansi: !process.env.NO_COLOR,
        paddingLeft: spaces(
            SIGNALE_PREAMBLE_LENGTH + scope.length + maxLabelLength
        ),
        paddingRight: spaces(RIGHT_PADDING),
        width: getTermWidth()
    };

    // For if we can't detect the beginning of the first line.
    const fallbackTrimLength =
        format.paddingLeft.length + CLI_FORMAT_ANSI_ADDITIONS;

    const getMaxLineLength = () =>
        format.width - format.paddingRight.length - format.paddingLeft.length;
    // We'll need this to trim the first line later.
    let maxLineLength = getMaxLineLength();

    output.on('resize', () => {
        format.width = getTermWidth();
        maxLineLength = getMaxLineLength();
    });

    typeEntries.forEach(([type]) => {
        // Enclose the old function, bound to the instance
        const thru = loggerInstance[type].bind(loggerInstance);
        // Wrapped function formats with cli-format.
        loggerInstance[type] = (str, ...rest) => {
            // Remove the first indent, because the signale prefix will be there!
            const wrapped = trimLeftToOriginalStr(
                cliFormat.wrap(str, format),
                str,
                maxLineLength,
                fallbackTrimLength
            );
            // Pass it through to signale.
            return thru(wrapped, ...rest);
        };
    });

    scopeCache.set(output, loggerInstance);
    return loggerInstance;
}

const highlight = str => chalk.whiteBright.bold(str);

function spinner(prefix, scope) {
    const running = [];
    const succeeded = [];
    const failed = [];
    let frameIndex = -1;
    const { interval, frames } = icons.spinFrames;
    const nextFrame = () =>
        frames[(frameIndex = (frameIndex + 1) % frames.length)];
    const spinner = new signale.Signale({
        config: {
            underlineLabel: false
        },
        interactive: true,
        scope
    });
    let timer;
    const logResults = (results, method, status) =>
        spinner[method](
            highlight(`${prefix} ${status}: ${results.join(', ')}`)
        );
    const finish = job => {
        running.splice(running.indexOf(job), 1);
        if (running.length === 0) {
            clearInterval(timer);
            if (failed.length > 0) {
                logResults(failed, 'error', 'failed');
            } else {
                logResults(succeeded, 'success', 'succeeded');
            }
        }
    };
    return {
        start(jobName) {
            running.push(jobName);
            if (running.length === 1) {
                timer = setInterval(() => {
                    const frame = nextFrame();
                    const spinners = running
                        .map(job => `${highlight(job)} ${frame}`)
                        .join('   ');
                    spinner.await(`${prefix}: ${spinners}`);
                }, interval);
            }
        },
        succeed(job) {
            succeeded.push(job);
            finish(job);
        },
        fail(job, message) {
            failed.push(job);
            finish(job);
            signale.error(`${highlight(prefix)} ${highlight(job)}`, message);
        }
    };
}

function simpleQueue(prefix, scope) {
    const log = new signale.Signale({
        config: {
            underlineLabel: false
        },
        scope
    });
    return {
        start(jobName) {
            log.await(`${prefix}: ${highlight(jobName)}`);
        },
        succeed(jobName) {
            log.success(`${prefix} succeeded: ${highlight(jobName)}`);
        },
        fail(jobName, message) {
            log.error(`${prefix} failed: ${highlight(jobName)}`, message);
        }
    };
}

const tasks = (prefix = 'Waiting for', scope = icons.buildpack) =>
    // If screen redrawing is supported, use spinners.
    process.stdout.moveCursor
        ? spinner(prefix, scope)
        : simpleQueue(prefix, scope);

module.exports = {
    highlight,
    logger,
    logoEmoji,
    tasks,
    types
};
