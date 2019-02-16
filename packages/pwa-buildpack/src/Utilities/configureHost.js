const debug = require('../util/debug').makeFileLogger(__filename);
const { highlight, logger } = require('./logging');
const { join } = require('path');
const { createHash } = require('crypto');
const devcert = require('devcert');
const os = require('os');
const execa = require('execa');
const isElevated = require('is-elevated');
const appConfigPath = require('application-config-path');
const log = logger();

const { username } = os.userInfo();

// On OSX and Windows, the default app config paths contain spaces. If copying
// and pasting from console output, any spaces will need explicit escaping.
const devCertConfigPath = appConfigPath('devcert').replace(/ /g, '\\ ');

/**
 * Monkeypatch devcert to fix
 * https://github.com/magento-research/pwa-studio/issues/679 which is blocked by
 * https://github.com/davewasmer/devcert/pull/30.
 * TODO: Remove this when a release of devcert without this bug is available
 */
const devCertUtils = require('devcert/dist/utils');
const MacOSPlatform = require('devcert/dist/platforms/darwin');
/* istanbul ignore next */
const proto = (MacOSPlatform.default || MacOSPlatform).prototype;
/* istanbul ignore next */
proto.isNSSInstalled = function() {
    debug(
        'Running patched `MacOSPlatform#isNSSInstalled method to detect certutil installation'
    );
    try {
        return devCertUtils
            .run('brew list -1')
            .toString()
            .includes('\nnss\n');
    } catch (e) {
        debug('certutil not installed!');
        return false;
    }
};

const willNotPasswordPrompt = async () => {
    try {
        // On Windows we will have no sudo or a non-standard sudo, so we should
        // not even try this.
        /* istanbul ignore else */
        if (process.platform !== 'win32') {
            // If standard `sudo` has run in the TTY recently, it may still have
            // a credential cached and it won't prompt for the password.
            // The -n flag means "non-interactive", so sudo will exit nonzero
            // instead of password prompting if the shell is not currently
            // authenticated.
            debug('Using sudo -n true to test whether credential is active');
            await execa.shell('sudo -n true');
            debug('sudo -n true succeeded, session is active');
            // If that succeeds, the shell is authenticated and it won't prompt:
            return true;
        }
    } catch (e) {
        debug(`sudo -n failed: ${e}\n\n trying isElevated()`);
        // Recover; the rest of this method will run if sudo -n failed.
    }
    const elevated = await isElevated();
    debug(`isElevated() === ${elevated}`);
    return elevated;
};

const alreadyProvisioned = hostname => {
    const exists = devcert.configuredDomains().includes(hostname);
    debug(`${hostname} already provisioned? ${exists}`);
    return exists;
};

async function runDevCert(hostname) {
    debug(`devcert.certificateFor(${hostname}) acquiring host & cert`);
    const certBuffers = await devcert.certificateFor(hostname);
    debug(`devcert.certificateFor(${hostname}) success!`);
    return {
        key: certBuffers.key.toString('utf8'),
        cert: certBuffers.cert.toString('utf8')
    };
}

async function getCert(hostname) {
    // Should be able to fetch non-interactively in either of these cases
    if (alreadyProvisioned(hostname) || (await willNotPasswordPrompt())) {
        debug(`either provisioned already or sudo is active, trying getCert`);
    } else {
        // warn that password prompt will occur
        log.info(
            `Creating a local development domain requires temporary administrative privileges.`
        );
        log.pending(
            `Please enter the password for ${highlight(
                username
            )} on ${highlight(os.hostname())}.`
        );
    }
    return runDevCert(hostname);
}

function getUniqueDomainAndPorts(customName, addUniqueHash) {
    let name = configureHost.DEFAULT_NAME;
    if (typeof customName === 'string') {
        name = customName;
    } else {
        const pkgLoc = join(process.cwd(), 'package.json');
        try {
            // eslint-disable-next-line node/no-missing-require
            const pkg = require(pkgLoc);
            if (!pkg.name || typeof pkg.name !== 'string') {
                throw new Error(
                    `package.json does not have a usable "name" field!`
                );
            }
            name = pkg.name;
        } catch (e) {
            log.warn(
                `Using default "${name}" prefix. Could not autodetect project name from package.json.`
            );
        }
    }
    const dirHash = createHash('md4');
    // Using a hash of the current directory is a natural way of preserving
    // the same "unique" ID for each project, and changing it only when its
    // location on disk has changed.
    dirHash.update(process.cwd());
    const digest = dirHash.digest('base64');

    const subdomain = addUniqueHash ? `${name}-${digest.slice(0, 5)}` : name;
    // Base64 truncated to 5 characters, stripped of special characters,
    // and lowercased to be a valid domain, is about 36^5 unique values.
    // There is therefore a chance of a duplicate ID and host collision,
    // specifically a 1 in 60466176 chance.

    // Use the same current directory hash to create a "unique" port number.
    // This creates a number from 1 to 1000 that wil stay constant for the
    // current directory. We'll create dev and staging ports for it.
    const uniquePortOffset =
        parseInt(
            Buffer.from(digest, 'base64')
                .toString('hex')
                .slice(-5),
            16
        ) % 1000;

    const ports = {
        development: 8000 + uniquePortOffset,
        staging: 9000 + uniquePortOffset
    };
    // In contrast, port collisions are more likely (1 in 1000), It could be a
    // lower probability if we allowed more possible ports, but for convenience
    // and developer recognition, we limit ports to the 8xxx range for
    // development and 9xxx range for staging. Fortunately, unlike domains,
    // ports are easy to rebind at runtime if a collision occurs.

    return {
        uniqueSubdomain: subdomain
            .toLowerCase()
            .replace(/[^a-zA-Z0-9]/g, '-')
            .replace(/^-+/, ''),
        ports
    };
}

async function configureHost({
    addUniqueHash = true,
    subdomain,
    exactDomain,
    interactive = true
} = {}) {
    const { uniqueSubdomain, ports } = getUniqueDomainAndPorts(
        exactDomain || subdomain,
        addUniqueHash
    );
    let hostname;
    if (exactDomain) {
        hostname = exactDomain;
    } else {
        hostname = uniqueSubdomain + '.' + configureHost.DEV_DOMAIN;
    }
    if (!alreadyProvisioned(hostname) && interactive === false) {
        return false;
    }
    try {
        const hostInfo = {
            hostname,
            ports,
            ssl: await getCert(hostname)
        };
        log.secure(`Acquired ${highlight(hostname)} and its SSL certificate`);
        return hostInfo;
    } catch (e) {
        throw Error(
            debug.errorMsg(`Could not setup development domain: \n${e.message}.

    If this keeps happening, you may need to delete the configuration files at
        ${devCertConfigPath}
    and try again.

    `)
        );
    }
}

configureHost.getUniqueDomainAndPorts = getUniqueDomainAndPorts;
configureHost.DEFAULT_NAME = 'my-pwa';
configureHost.DEV_DOMAIN = 'local.pwadev';

module.exports = configureHost;
