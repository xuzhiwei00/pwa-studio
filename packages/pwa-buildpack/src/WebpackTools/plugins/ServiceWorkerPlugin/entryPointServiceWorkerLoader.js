/** global window, module */
const makeCodeInjectorLoader = require('./makeCodeInjectorLoader');

module.exports = makeCodeInjectorLoader(
    'installs and maintains the ServiceWorker from the entry point',
    function installServiceWorker(conf) {
        function register() {
            var registering = window.navigator.serviceWorker.register(
                conf.swPublicPath
            );
            if (conf.debug) {
                registering
                    .then(function(registration) {
                        console.log('Service worker registered', registration);
                    })
                    .catch(function(e) {
                        console.warn('Service worker registration failed', e);
                    });
            } else {
                registering.catch(function() {});
            }
        }
        function unregister
        if ('serviceWorker' in window.navigator) {
            window.addEventListener('load', register);
            if (module.hot) {
                module.hot.accept(conf.swPublicPath, register);
            }
        }
    },
    ({ swPublicPath, debug }) => ({ swPublicPath, debug })
);
