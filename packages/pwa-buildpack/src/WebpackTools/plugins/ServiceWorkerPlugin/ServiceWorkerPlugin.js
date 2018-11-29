const path = require('path');
const WorkboxPlugin = require('workbox-webpack-plugin');

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
    }
    apply(compiler) {
        if (compiler.options.mode === 'development' && !this.debug) {
            console.warn(
                `\n[pwa-buildpack]: ServiceWorkerPlugin disables all ServiceWorkers by default in development mode, to prevent accidental caching. To enable ServiceWorkers in development, pass \`debug: true\` to the ServiceWorkerPlugin configuration, or set the environment variable MAGENTO_BUILDPACK_DEBUG_SERVICEWORKER.\n`
            );
        } else if (!compiler.inputFileSystem.readFileSync(this.swSrcPath)) {
            throw new Error(
                `[pwa-buildpack]: ServiceWorkerPlugin could not locate ServiceWorker source file at '${
                    this.swSrcPath
                }'`
            );
        }
        this.compiler = compiler;
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

        output.filename = data =>
            data.chunk.name === swEntryName
                ? this.swPublicPath
                : fallthru(data);

        // TODO: when Webpack supports ServiceWorkers as a target, the below
        // will no longer be necessary. This changes the global object in
        // Webpack's boilerplate from 'window' to 'this'.
        output.globalObject = "(typeof self !== 'undefined' ? self : this)";
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
            const entries = Object.entries(compilation.options.entry);

            const isEntryPoint = mod =>
                entries.some(entry =>
                    typeof entry === 'string'
                        ? mod.resource === entry
                        : entry.includes(mod.resource)
                );
            const isServiceWorkerEntry = mod => mod.resource === swSrcPath;

            // const hasLoader = mod =>
            //     mod.loaders.some(({ loader }) => loader === loaderPath);

            compilation.hooks.normalModuleLoader.tap(
                pluginName,
                (loaderContext, mod) => {
                    // if (hasLoader(mod)) {
                    //     return;
                    // }
                    if (isServiceWorkerEntry(mod)) {
                        this.addLoader(
                            loaderPaths.serviceWorkerDebugLoader,
                            mod
                        );
                    } else if (isEntryPoint(mod)) {
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
