const { getOptions } = require('loader-utils');
module.exports = function makeCodeInjectorLoader(mission, code, pickOptions) {
    return function injectCode(content) {
        return (
            content +
            `

/**
 * ServiceWorkerPlugin injected code below. DO NOT EDIT MANUALLY.
 * The following code ${mission}.
 */
(${code.toString()})(${JSON.stringify(pickOptions(getOptions(this)))});`
        );
    };
};
