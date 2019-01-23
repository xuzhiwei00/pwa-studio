/** global workbox, module, self */
const makeCodeInjectorLoader = require('./makeCodeInjectorLoader');

module.exports = makeCodeInjectorLoader(
    'handles Webpack developer mode messages from the page to the ServiceWorker',
    function devServiceWorker(conf) {
        if (conf.debug) {
            const ORANGE = [244, 111, 37];
            const DEEPORANGE = ORANGE.map(channel => ~~(channel * 0.65));
            const logPrefix = [
                '%cPWA Studio dev mode',
                `background: rgb(${ORANGE}); color: white; padding: 2px 0.5em; border: 5px solid rgb(${DEEPORANGE}); border-width: 0 5px`
            ];
            const log = function() {
                console.log.apply(
                    console,
                    logPrefix.concat([].slice.call(arguments))
                );
            };
            workbox.setConfig({ debug: true });
            self.addEventListener('install', function(event) {
                log('ServiceWorker installed, forcing update', event);
                event.skipWaiting && event.skipWaiting();
            });
            self.addEventListener('activate', function() {
                log('ServiceWorker activated, taking over active page');
                clients.claim && clients.claim();
            });
        }
    },
    ({ debug }) => ({ debug })
);
