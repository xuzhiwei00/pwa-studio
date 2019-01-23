const debug = require('../../../util/debug').makeFileLogger(__dirname);
const { getOptions } = require('loader-utils');
module.exports = function makeCodeInjectorLoader(mission, code, pickOptions) {
    return function injectCode(content) {
        debug('Injecting loader %s with options %o', mission, pickOptions);
        return `

/**
 * ServiceWorkerPlugin injected code below. DO NOT EDIT MANUALLY.
 * The following code ${mission}.
 */
(${code.toString()})(${JSON.stringify(pickOptions(getOptions(this)))});

/**
 * End ServiceWorkerPlugin injected code.
 */

${content}`;
    };
};
