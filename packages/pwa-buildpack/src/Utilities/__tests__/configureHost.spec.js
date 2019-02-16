jest.mock('devcert');
jest.mock('execa');
jest.mock('is-elevated', () => jest.fn(async () => true));
jest.mock('../logging');

const FAKE_CWD = '/path/to/fake/cwd';

const pkgLocTest = FAKE_CWD + '/package.json';
const pkg = jest.fn();
jest.doMock(pkgLocTest, pkg, { virtual: true });
const devcert = require('devcert');
const { configureHost } = require('../');
const isElevated = require('is-elevated');
const execa = require('execa');

const fakeCertPair = {
    key: Buffer.from('fakeKey'),
    cert: Buffer.from('fakeCert')
};

isElevated.mockReturnValue(true);

const simulate = {
    certCached() {
        devcert.configuredDomains
            .mockReturnValueOnce({
                includes: () => true
            })
            .mockReturnValueOnce({
                includes: () => true
            });
        devcert.certificateFor.mockResolvedValueOnce(fakeCertPair);
        return simulate;
    },
    certNotCached() {
        devcert.configuredDomains.mockReturnValueOnce([]);
    },
    certCreated() {
        devcert.configuredDomains
            .mockReturnValueOnce([])
            .mockReturnValueOnce([]);
        devcert.certificateFor.mockResolvedValueOnce(fakeCertPair);
        return simulate;
    },
    certFailed(message) {
        devcert.configuredDomains
            .mockReturnValueOnce([])
            .mockReturnValueOnce([]);
        devcert.certificateFor.mockRejectedValueOnce(new Error(message));
        return simulate;
    },
    noPackageFound() {
        jest.resetModuleRegistry();
        pkg.mockImplementationOnce(() => {
            const error = new Error(process.cwd() + '/package.json not found');
            error.code = error.errno = 'ENOTFOUND';
            throw error;
        });
        return simulate;
    },
    packageNameIs(name) {
        jest.resetModules();
        pkg.mockImplementationOnce(() => ({ name }));
        return simulate;
    },
    passwordRequired() {
        execa.shell.mockRejectedValueOnce(new Error('whatever'));
        isElevated.mockReturnValueOnce(false);
    }
};

// intercept and simulate cwd value
beforeEach(() => {
    jest.spyOn(process, 'cwd');
    process.cwd.mockReturnValue(FAKE_CWD);
});

afterEach(() => {
    process.cwd.mockRestore();
});

const hostRegex = (
    name = configureHost.DEFAULT_NAME,
    domain = configureHost.DEV_DOMAIN
) => new RegExp(`${name}\\-[\\w\\-]{4,5}\\.${domain}$`);

test('produces a secure domain, port set, and ssl cert from default name if no package.json is found', async () => {
    simulate.noPackageFound().certCached();

    const { hostname, ports, ssl } = await configureHost();
    expect(hostname).toMatch(hostRegex());
    expect(ports.development).toBeGreaterThanOrEqual(8000);
    expect(ports.development).toBeLessThan(9000);
    expect(ports.staging).toBeGreaterThanOrEqual(9000);
    expect(ports.staging).toBeLessThan(10000);
    expect(ssl).toMatchObject({
        cert: 'fakeCert',
        key: 'fakeKey'
    });
    expect(devcert.certificateFor).toHaveBeenCalledTimes(1);

    // expect same port set per host
    simulate.noPackageFound().certCached();
    const { ports: secondPorts } = await configureHost();
    expect(secondPorts).toEqual(ports);
});

test('produces a secure domain with default name if package name is unusable', async () => {
    simulate.packageNameIs(undefined).certCached();
    const { hostname } = await configureHost();
    expect(hostname).toMatch(hostRegex());
});

test('produces a secure domain from package name', async () => {
    simulate.packageNameIs('package-name-yay').certCached();
    const { hostname } = await configureHost();
    expect(hostname).toMatch(hostRegex('package-name-yay'));
});

test('produces a secure domain from custom subdomain', async () => {
    simulate.packageNameIs('package-name-yay').certCached();
    const { hostname } = await configureHost({
        subdomain: 'friends-of-desoto'
    });
    expect(hostname).toMatch(hostRegex('friends-of-desoto'));
    pkg.mockReset(); // because it was never called
});

test('produces a secure domain from custom subdomain without unique autogen', async () => {
    simulate.certCached();
    const { hostname } = await configureHost({
        subdomain: 'friends-of-desoto',
        addUniqueHash: false
    });
    expect(hostname).toMatch(
        new RegExp(`friends-of-desoto\\.${configureHost.DEV_DOMAIN}$`)
    );
});

test('autogenerates a secure domain without unique autogen', async () => {
    simulate.certCached().packageNameIs('bigdog');
    const { hostname } = await configureHost({
        addUniqueHash: false
    });
    expect(hostname).toMatch(
        new RegExp(`bigdog\\.${configureHost.DEV_DOMAIN}$`)
    );
});

test('produces a secure domain from exact domain provided', async () => {
    simulate.certCached();
    const { hostname } = await configureHost({
        exactDomain: 'gagh.biz'
    });
    expect(hostname).toBe('gagh.biz');
});

test('password prompts', async () => {
    simulate.certCreated();
    await configureHost({ subdomain: 'best-boss-i-ever-had' });
    simulate.certCreated();
    simulate.passwordRequired();
    await expect(
        configureHost({ subdomain: 'bar-none' })
    ).resolves.not.toThrow();
});

test('returns false if not already provisioned and non-interactive specified', async () => {
    simulate.certNotCached();
    expect(
        await configureHost({
            subdomain: 'no-prod-for-you',
            interactive: false
        })
    ).toBe(false);
});

test('fails informatively if devcert fails', async () => {
    simulate.certFailed();
    await expect(configureHost({ subdomain: 'uss.hood' })).rejects.toThrowError(
        'Could not setup development domain'
    );
    simulate.certFailed();
    simulate.passwordRequired();
    await expect(configureHost({ subdomain: 'uss.hood' })).rejects.toThrowError(
        'Could not setup'
    );
});
