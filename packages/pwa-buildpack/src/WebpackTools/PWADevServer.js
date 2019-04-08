require('dotenv').config();
const debug = require('../util/debug').makeFileLogger(__filename);
const debugErrorMiddleware = require('debug-error-middleware').express;
const {
    default: playgroundMiddleware
} = require('graphql-playground-middleware-express');
const url = require('url');
const optionsValidator = require('../util/options-validator');
const chalk = require('chalk');
const configureHost = require('../Utilities/configureHost');
const portscanner = require('portscanner');
const { readdir: readdirAsync, readFile: readFileAsync } = require('fs');
const { promisify } = require('util');
const readdir = promisify(readdirAsync);
const readFile = promisify(readFileAsync);
const { resolve, relative } = require('path');
const boxen = require('boxen');
const addImgOptMiddleware = require('../Utilities/addImgOptMiddleware');

const secureHostWarning = chalk.redBright(`
    To enable all PWA features and avoid ServiceWorker collisions, PWA Studio
    highly recommends using the ${chalk.whiteBright(
        '"provideSecureHost"'
    )} configuration
    option of PWADevServer.
`);

const helpText = `
    To autogenerate a unique host based on project name
    and location on disk, simply add:
    ${chalk.whiteBright('provideSecureHost: true')}
    to PWADevServer configuration options.

    More options for this feature are described in documentation.
`;

const PWADevServer = {
    validateConfig: optionsValidator('PWADevServer', {
        publicPath: 'string',
        projectConfig: 'object'
    }),
    async configure(config) {
        debug('configure() invoked', config);
        PWADevServer.validateConfig('.configure(config)', config);

        const { projectConfig } = config;

        const devServerEnvVars = projectConfig.section('devServer');

        const devServerConfig = {
            // TODO: Incorporate docker-specific env vars like this one into
            // new configureEnvironment system.
            public: process.env.PWA_STUDIO_PUBLIC_PATH || '',
            contentBase: false, // UpwardPlugin serves static files
            compress: true,
            hot: true,
            watchOptions: {
                // polling is CPU intensive - provide the option to turn it on if needed
                poll:
                    !!parseInt(devServerEnvVars.watchOptionsUsePolling) || false
            },
            host: '0.0.0.0',
            port:
                devServerEnvVars.port ||
                (await portscanner.findAPortNotInUse(10000)),
            stats: {
                all: !process.env.NODE_DEBUG ? false : undefined,
                builtAt: true,
                colors: true,
                errors: true,
                errorDetails: true,
                moduleTrace: true,
                timings: true,
                version: true,
                warnings: true
            },
            after(app, server) {
                app.use(debugErrorMiddleware());
                let readyNotice = chalk.green(
                    `PWADevServer ready at ${chalk.greenBright.underline(
                        devServerConfig.publicPath
                    )}`
                );
                if (config.graphqlPlayground) {
                    readyNotice +=
                        '\n' +
                        chalk.blueBright(
                            `GraphQL Playground ready at ${chalk.blueBright.underline(
                                new url.URL(
                                    '/graphiql',
                                    devServerConfig.publicPath
                                )
                            )}`
                        );
                }
                server.middleware.waitUntilValid(() =>
                    console.log(
                        boxen(readyNotice, {
                            borderColor: 'gray',
                            float: 'center',
                            align: 'center',
                            margin: 1,
                            padding: 1
                        })
                    )
                );
            },
            before(app) {
                addImgOptMiddleware(app, {
                    ...projectConfig.section('imageService'),
                    backendUrl: projectConfig.section('magento').backendUrl
                });
            }
        };
        const customOriginConfig = projectConfig.section('customOrigin');
        if (customOriginConfig.enabled) {
            const customOrigin = await configureHost(
                Object.assign(customOriginConfig, {
                    interactive: false
                })
            );
            if (!customOrigin) {
                console.warn(
                    chalk.yellowBright(
                        'Custom origins are enabled for this project, but one has not yet been set up. Run `npx @magento/pwa-buildpack init-custom-origin <projectRoot>` to initialize a custom origin.'
                    )
                );
            } else {
                const { hostname, ssl, ports } = customOrigin;
                devServerConfig.host = hostname;
                devServerConfig.https = ssl;
                // workaround for https://github.com/webpack/webpack-dev-server/issues/1491
                devServerConfig.https.spdy = {
                    protocols: ['http/1.1']
                };

                const requestedPort =
                    devServerEnvVars.port || ports.development;
                if (
                    (await portscanner.checkPortStatus(requestedPort)) ===
                    'closed'
                ) {
                    devServerConfig.port = requestedPort;
                } else {
                    console.warn(
                        chalk.yellowBright(
                            '\n' +
                                debug.errorMsg(
                                    `This project's dev server is configured to run at ${hostname}:${requestedPort}, but port ${requestedPort} is in use. The dev server will run temporarily on port ${chalk.underline.whiteBright(
                                        devServerConfig.port
                                    )}; you may see inconsistent ServiceWorker behavior.`
                                ) +
                                '\n'
                        )
                    );
                }
            }
        } else {
            console.warn(secureHostWarning + helpText);
        }

        const { graphqlPlayground } = config;
        if (graphqlPlayground) {
            const { queryDirs = [] } = graphqlPlayground;
            const endpoint = '/graphql';

            const queryDirListings = await Promise.all(
                queryDirs.map(async dir => {
                    const files = await readdir(dir);
                    return { dir, files };
                })
            );

            const queryDirContents = await Promise.all(
                queryDirListings.map(({ dir, files }) =>
                    Promise.all(
                        files.map(async queryFile => {
                            const fileAbsPath = resolve(dir, queryFile);
                            const query = await readFile(fileAbsPath, 'utf8');
                            const name = relative(process.cwd(), fileAbsPath);
                            return {
                                endpoint,
                                name,
                                query
                            };
                        })
                    )
                )
            );
            const tabs = [].concat(...queryDirContents); // flatten

            const oldBefore = devServerConfig.before;
            devServerConfig.before = app => {
                oldBefore(app);
                // this middleware has a bad habit of calling next() when it
                // should not, so let's give it a noop next()
                const noop = () => {};
                const middleware = playgroundMiddleware({
                    endpoint,
                    tabs
                });
                app.get('/graphiql', (req, res) => middleware(req, res, noop));
            };
        }

        // Public path must be an absolute URL to enable hot module replacement
        // If public key is set, then publicPath should equal the public key value - supports proxying https://bit.ly/2EOBVYL
        devServerConfig.publicPath = devServerConfig.public
            ? `https://${devServerConfig.public}/`
            : url.format({
                  protocol: devServerConfig.https ? 'https:' : 'http:',
                  hostname: devServerConfig.host,
                  port: devServerConfig.port,
                  // ensure trailing slash
                  pathname: config.publicPath.replace(/([^\/])$/, '$1/')
              });
        return devServerConfig;
    }
};
module.exports = PWADevServer;
