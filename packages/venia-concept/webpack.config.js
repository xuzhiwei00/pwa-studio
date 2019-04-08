const Buildpack = require('@magento/pwa-buildpack');

module.exports = async function setupBuildpackBuild(webpackCliEnv) {
    const config = await Buildpack.configureWebpack(__dirname, webpackCliEnv);
    // Modify Webpack configuration object here if necessary.
    return config;
};
