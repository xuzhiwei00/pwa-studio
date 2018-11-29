/** global workbox, module, self */
const makeCodeInjectorLoader = require('./makeCodeInjectorLoader');

module.exports = makeCodeInjectorLoader(
    'handles Webpack developer mode from the ServiceWorker',
    function devServiceWorker(conf) {
        if (conf.debug) {
            workbox.setConfig({ debug: true });
        }
        if (module.hot) {
            module.hot.dispose(function() {
                return self.registration
                    .unregister()
                    .then(function() {
                        return self.clients.matchAll();
                    })
                    .then(function(clients) {
                        clients.forEach(function(client) {
                            client.navigate(client.url);
                        });
                    });
            });
        }
    },
    ({ debug }) => ({ debug })
);
