jest.mock('@httptoolkit/workbox-webpack-plugin');

const WorkboxPlugin = require('@httptoolkit/workbox-webpack-plugin');

const ServiceWorkerPlugin = require('../ServiceWorkerPlugin');

test.skip('throws if options are missing', () => {
    expect(() => new ServiceWorkerPlugin({})).toThrow(
        'env.mode must be of type string'
    );
    expect(
        () =>
            new ServiceWorkerPlugin({
                env: { mode: 'development' },
                serviceWorkerFileName: 'file.name'
            })
    ).toThrow('paths.output must be of type string');
});

test.skip('returns a valid Webpack plugin', () => {
    expect(
        new ServiceWorkerPlugin({
            env: {
                mode: 'development'
            },
            serviceWorkerFileName: 'sw.js',
            runtimeCacheAssetPath: 'https://location/of/assets',
            paths: {
                output: 'path/to/assets'
            }
        })
    ).toHaveProperty('apply', expect.any(Function));
});

test.skip('.apply calls WorkboxPlugin.GenerateSW in prod', () => {
    const plugin = new ServiceWorkerPlugin({
        env: {
            mode: 'production'
        },
        serviceWorkerFileName: 'sw.js',
        runtimeCacheAssetPath: 'https://location/of/assets',
        paths: {
            output: 'path/to/assets'
        }
    });
    const workboxApply = jest.fn();
    const fakeCompiler = {};
    WorkboxPlugin.GenerateSW.mockImplementationOnce(() => ({
        apply: workboxApply
    }));

    plugin.apply(fakeCompiler);

    expect(WorkboxPlugin.GenerateSW).toHaveBeenCalledWith(
        expect.objectContaining({
            globDirectory: 'path/to/assets',
            globPatterns: expect.arrayContaining([expect.any(String)]),
            swDest: 'sw.js'
        })
    );
    expect(workboxApply).toHaveBeenCalledWith(fakeCompiler);
});

test.skip('.apply calls nothing but warns in console in dev', () => {
    const plugin = new ServiceWorkerPlugin({
        env: {
            mode: 'development'
        },
        serviceWorkerFileName: 'sw.js',
        runtimeCacheAssetPath: 'https://location/of/assets',
        paths: {
            output: 'path/to/assets'
        }
    });
    jest.spyOn(console, 'warn').mockImplementationOnce(() => {});

    plugin.apply({});

    expect(WorkboxPlugin.GenerateSW).not.toHaveBeenCalled();

    expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining(
            `Emitting no ServiceWorker in development mode.`
        )
    );

    console.warn.mockRestore();
});

test.skip('.apply generates and writes out a serviceworker when enableServiceWorkerDebugging is set', () => {
    const plugin = new ServiceWorkerPlugin({
        env: {
            mode: 'development'
        },
        enableServiceWorkerDebugging: true,
        serviceWorkerFileName: 'sw.js',
        runtimeCacheAssetPath: 'https://location/of/assets',
        paths: {
            output: 'path/to/assets'
        }
    });

    const fakeCompiler = {};
    const workboxApply = jest.fn();
    WorkboxPlugin.GenerateSW.mockImplementationOnce(() => ({
        apply: workboxApply
    }));
    plugin.apply(fakeCompiler);

    expect(WorkboxPlugin.GenerateSW).toHaveBeenCalledWith(
        expect.objectContaining({
            globDirectory: 'path/to/assets',
            globPatterns: expect.arrayContaining([expect.any(String)]),
            swDest: 'sw.js'
        })
    );
});

test.skip('.apply uses `InjectManifest` when `injectManifest` is `true`', () => {
    const injectManifestConfig = {
        swSrc: 'path/to/sw',
        swDest: 'path/to/dest'
    };
    const plugin = new ServiceWorkerPlugin({
        env: {
            mode: 'development'
        },
        enableServiceWorkerDebugging: true,
        serviceWorkerFileName: 'sw.js',
        injectManifest: true,
        paths: {
            output: 'path/to/assets'
        },
        injectManifestConfig
    });

    const fakeCompiler = {};
    const workboxApply = jest.fn();
    WorkboxPlugin.InjectManifest.mockImplementationOnce(() => ({
        apply: workboxApply
    }));

    plugin.apply(fakeCompiler);

    expect(WorkboxPlugin.InjectManifest).toHaveBeenCalledWith(
        expect.objectContaining(injectManifestConfig)
    );
});
