const debug = require('../../../util/debug').makeFileLogger(__dirname);
const path = require('path');
const WorkboxPlugin = require('@httptoolkit/workbox-webpack-plugin');

const loaderPaths = {
    entryPointServiceWorkerLoader: require.resolve(
        './entryPointServiceWorkerLoader'
    ),
    serviceWorkerDebugLoader: require.resolve('./serviceWorkerDebugLoader')
};

class ServiceWorkerPlugin {
    constructor(config = {}) {
        if (typeof config.src !== 'string') {
            throw new Error(
                `[pwa-buildpack]: ServiceWorkerPlugin configuration must specify a 'src' path.`
            );
        }
        this.swSrcPath = config.src;
        this.debug =
            config.debug || process.env.MAGENTO_BUILDPACK_DEBUG_SERVICEWORKER;
        this.swPublicPath = path.basename(this.swSrcPath);
        this.swEntryName = this.swPublicPath.split('.')[0]; // entry has no extension
        debug('created %o', this);
    }
    apply(compiler) {
        this.compiler = compiler;
        if (compiler.options.mode === 'development' && !this.debug) {
            console.warn(
                `\n[pwa-buildpack]: ServiceWorkerPlugin disables all ServiceWorkers by default in development mode, to prevent accidental caching. To enable ServiceWorkers in development, pass \`debug: true\` to the ServiceWorkerPlugin configuration, or set the environment variable MAGENTO_BUILDPACK_DEBUG_SERVICEWORKER.\n`
            );
            this.disabled = true;
        } else if (!compiler.inputFileSystem.readFileSync(this.swSrcPath)) {
            throw new Error(
                `[pwa-buildpack]: ServiceWorkerPlugin could not locate ServiceWorker source file at '${
                    this.swSrcPath
                }'`
            );
        }
        debug('ServiceWorkerPlugin#apply()');
        this.addEntry();
        this.applyInjectLoaders();
        this.applyInjectManifest();
    }

    addEntry() {
        const {
            compiler: {
                options: { entry, output }
            },
            swEntryName,
            swSrcPath
        } = this;
        if (entry.hasOwnProperty(swEntryName)) {
            throw new Error(
                `[pwa-buildpack]: ServiceWorkerPlugin could not add an additional Webpack entry '${swEntryName}' to build '${swSrcPath}', because '${swEntryName}' is already configured as an entry pointing to '${
                    entry[swEntryName]
                }'.`
            );
        }
        if (!output.hasOwnProperty('filename')) {
            throw new Error(
                `[pwa-buildpack]: ServiceWorkerPlugin could not edit the 'output.filename' of the Webpack config because it is not set. Please set a filename string or function as described in https://webpack.js.org/configuration/output/#output-filename.`
            );
        }
        entry[swEntryName] = swSrcPath;
        const oldFilename = output.filename;
        // handle both cases, whether config specifies a string or function
        const fallthru =
            typeof oldFilename === 'string' ? () => oldFilename : oldFilename;

        output.filename = data => {
            debug(
                `ServiceWorkerPlugin#addEntry output.filename callback called with %o, fallthru %s`,
                { chunkName: data.chunk.name },
                fallthru
            );
            return data.chunk.name === swEntryName
                ? this.swPublicPath
                : fallthru(data);
        };

        // TODO: when Webpack supports ServiceWorkers as a target, the below
        // will no longer be necessary. This changes the global object in
        // Webpack's boilerplate from 'window' to 'this'.
        output.globalObject = "(typeof self !== 'undefined' ? self : this)";

        debug(`ServiceWorkerPlugin#addEntry() ran: %O`, { entry, output });
    }

    addLoader(loader, mod, opts) {
        mod.loaders.push({
            loader,
            options: Object.assign(
                {
                    debug: this.debug,
                    swSrcPath: this.swSrcPath,
                    swPublicPath: this.swPublicPath
                },
                opts
            )
        });
    }

    applyInjectLoaders() {
        const {
            compiler,
            constructor: { name: pluginName },
            swSrcPath
        } = this;

        compiler.hooks.compilation.tap(pluginName, compilation => {
            const entries = Object.values(compilation.options.entry);

            // Only triggers once per entry point; since webpack-dev-server adds
            // its own scripts to the entry array, the loader could accidentally
            // inject this code more than once.
            const isEntryPoint = mod => {
                const foundEntryPoint = entries.findIndex(
                    entry =>
                        mod.resource.indexOf('/node_modules/') === -1 &&
                        (typeof entry === 'string'
                            ? mod.resource === entry
                            : entry.includes(mod.resource))
                );
                if (foundEntryPoint !== -1) {
                    return entries.splice(foundEntryPoint);
                }
            };
            const isServiceWorkerEntry = mod => mod.resource === swSrcPath;

            debug(`ServiceWorkerPlugin#applyInjectLoaders compilation hook`);

            compilation.hooks.normalModuleLoader.tap(
                pluginName,
                (loaderContext, mod) => {
                    // if (hasLoader(mod)) {
                    //     return;
                    // }
                    if (isServiceWorkerEntry(mod)) {
                        debug(
                            `ServiceWorkerPlugin normalModuleLoader hook: %s isServiceWorkerEntry!`,
                            mod.resource
                        );
                        this.addLoader(
                            loaderPaths.serviceWorkerDebugLoader,
                            mod
                        );
                    } else if (isEntryPoint(mod)) {
                        debug(
                            'ServiceWorkerPlugin normalModuleLoader hook: %s isEntryPoint!',
                            mod.resource
                        );
                        this.addLoader(
                            loaderPaths.entryPointServiceWorkerLoader,
                            mod
                        );
                    }
                }
            );
        });
    }

    applyInjectManifest() {
        const { compiler } = this;
        const { output } = compiler.options;
        /**
         * Hack to allow InjectManifest to operate on an already-built
         * service worker from the inputFileSystem.
         */
        const swSrc = this.swPublicPath + Math.random();
        const fallbackReadFile = compiler.inputFileSystem.readFile.bind(
            compiler.inputFileSystem
        );
        let compilation;
        compiler.hooks.thisCompilation.tap(
            this.constructor.name,
            thisCompilation => {
                compilation = thisCompilation;
            }
        );
        compiler.inputFileSystem.readFile = (filepath, cb) => {
            if (filepath === swSrc) {
                return cb(null, compilation.assets[this.swPublicPath].source());
            }
            return fallbackReadFile(filepath, cb);
        };

        new WorkboxPlugin.InjectManifest({
            swSrc,
            swDest: path.join(output.path, this.swPublicPath)
        }).apply(this.compiler);
    }
}
module.exports = ServiceWorkerPlugin;
