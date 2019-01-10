/** global window, module */
const makeCodeInjectorLoader = require('./makeCodeInjectorLoader');

module.exports = makeCodeInjectorLoader(
    'installs and maintains the ServiceWorker from the entry point',
    // The below code will be injected without Babel transforms
    // into the client. Avoid arrow functions and other ES6 features to be safe,
    // even though they're likely to be there.
    function installServiceWorker(conf) {
        if (!('serviceWorker' in window.navigator)) {
            return;
        }

        const swContainer = window.navigator.serviceWorker;

        if (conf.disabled) {
            window.addEventListener('load', unregister);
        } else {
            window.addEventListener('load', register);
            if (module.hot) {
                module.hot.accept(conf.swPublicPath, update);
            }
        }

        function debugLogSW(operationPromise, operationName) {
            if (conf.debug) {
                return operationPromise
                    .then(function(registration) {
                        console.log(
                            'Service worker ' + operationName + ' success',
                            registration
                        );
                        return registration;
                    })
                    .catch(function(e) {
                        console.warn(
                            'Service worker ' + operationName + ' failed',
                            e
                        );
                    });
            }
            return operationPromise;
        }

        // Cast registrations array to a Promise if it isn't one.
        // TODO: According to https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/getRegistrations,
        // ServiceWorkerContainer.getRegistrations() may or may not return
        // a Promise, but that may be a misprint.
        function forEachRegistration(callback) {
            return Promise.resolve(swContainer.getRegistrations()).then(
                function(registrations) {
                    return Promise.all(registrations.map(callback));
                }
            );
        }

        function register() {
            const registering = swContainer.register(conf.swPublicPath);
            return debugLogSW(registering, 'registration');
        }
        function update() {
            return forEachRegistration(function(registration) {
                const updating = registration.update();
                return debugLogSW(updating, 'update');
            });
        }
        function unregister() {
            return forEachRegistration(function(registration) {
                const unregistering = registration.unregister();
                return debugLogSW(unregistering, 'unregister');
            });
        }
    },
    ({ swPublicPath, disabled, debug }) => ({ swPublicPath, disabled, debug })
);
