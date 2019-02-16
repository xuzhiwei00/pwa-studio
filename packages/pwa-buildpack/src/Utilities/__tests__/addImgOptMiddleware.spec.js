const MAGENTO_BACKEND_URL = 'one';
const IMAGE_SERVICE_PATH = 'two';
const IMAGE_CACHE_EXPIRES = 'three';
const IMAGE_CACHE_DEBUG = 'four';
const IMAGE_CACHE_REDIS_CLIENT = '';

const defaultEnv = {
    MAGENTO_BACKEND_URL,
    IMAGE_SERVICE_PATH,
    IMAGE_CACHE_EXPIRES,
    IMAGE_CACHE_DEBUG,
    IMAGE_CACHE_REDIS_CLIENT
};

const simulate = {
    missing: moduleName =>
        jest.doMock(moduleName, () => {
            throw new Error('Not found');
        }),
    is: (moduleName, impl) => {
        jest.doMock(moduleName, () => impl);
        return impl;
    }
};

const app = {
    use: jest.fn()
};
let warn;
beforeEach(() => {
    jest.resetModuleRegistry();
    jest.doMock('../logging');
    warn = require('../logging').mockLogger.warn;
    app.use.mockReset();
    warn.mockClear();
});

test('loads full middleware when dependencies are present, using env', () => {
    // populate env, storing old values
    const oldEnv = Object.keys(defaultEnv).map(key => [key, process.env[key]]);
    Object.assign(process.env, defaultEnv);

    const cache = simulate.is('apicache', {
        middleware: jest.fn(() => 'the cache middleware')
    });

    const expressSharp = simulate.is(
        '@magento/express-sharp',
        jest.fn(() => 'the sharp middleware')
    );

    const addImgOptMiddleware = require('../addImgOptMiddleware');
    expect(addImgOptMiddleware).toBeInstanceOf(Function);

    expect(() => addImgOptMiddleware(app)).not.toThrow();

    expect(cache.middleware).toHaveBeenCalledTimes(1);
    expect(cache.middleware).toHaveBeenCalledWith(
        IMAGE_CACHE_EXPIRES,
        null,
        expect.objectContaining({
            debug: IMAGE_CACHE_DEBUG,
            redisClient: IMAGE_CACHE_REDIS_CLIENT
        })
    );

    expect(expressSharp).toHaveBeenCalledWith(
        expect.objectContaining({
            baseHost: MAGENTO_BACKEND_URL
        })
    );

    expect(app.use).toHaveBeenCalledWith(
        IMAGE_SERVICE_PATH,
        'the cache middleware',
        'the sharp middleware'
    );
    // put old env back so test does not leak
    oldEnv.forEach(([key, oldValue]) => {
        process.env[key] = oldValue;
    });
});

test('loads full middleware from passed env object', () => {
    const cache = simulate.is('apicache', {
        middleware: jest.fn(() => 'the cache middleware')
    });
    simulate.is('@magento/express-sharp', jest.fn());

    const env = {
        ...defaultEnv,
        IMAGE_CACHE_DEBUG: true
    };

    require('../addImgOptMiddleware')(app, env);

    expect(cache.middleware).toHaveBeenCalledWith(
        IMAGE_CACHE_EXPIRES,
        null,
        expect.objectContaining({
            debug: true
        })
    );
});

test('uses redis client if redis config is populated', () => {
    const redis = simulate.is('redis', {
        redisClient: jest.fn(() => 'a redis client')
    });
    const cache = simulate.is('apicache', { middleware: jest.fn() });
    simulate.is('@magento/express-sharp', jest.fn());

    const env = {
        ...defaultEnv,
        IMAGE_CACHE_REDIS_CLIENT: {}
    };

    require('../addImgOptMiddleware')(app, env);

    expect(redis.redisClient).toHaveBeenCalledWith(
        env.IMAGE_CACHE_REDIS_CLIENT
    );

    expect(cache.middleware).toHaveBeenCalledWith(
        IMAGE_CACHE_EXPIRES,
        null,
        expect.objectContaining({
            redisClient: 'a redis client'
        })
    );
});

test('returns a noop function and warns if apicache dep is missing', () => {
    simulate.missing('apicache');
    const expressSharp = simulate.is('@magento/express-sharp', jest.fn());

    require('../addImgOptMiddleware')(app);

    expect(app.use).not.toHaveBeenCalled();
    expect(expressSharp).toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    const warning = warn.mock.calls[0][0];
    expect(warning).not.toMatch(/express-sharp/);
    expect(warning).toMatch(/apicache/);
});

test('returns a noop function and warns if express-sharp dep is missing', () => {
    simulate.missing('@magento/express-sharp');
    const cache = simulate.is('apicache', { middleware: jest.fn() });

    require('../addImgOptMiddleware')(app);

    expect(app.use).not.toHaveBeenCalled();
    expect(cache.middleware).toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    const warning = warn.mock.calls[0][0];
    expect(warning).not.toMatch(/apicache/);
    expect(warning).toMatch(/express-sharp/);
});

test('returns a noop function and warns if both deps are missing', () => {
    simulate.missing('apicache');
    simulate.missing('@magento/express-sharp');

    require('../addImgOptMiddleware')(app);

    expect(app.use).not.toHaveBeenCalled();
    const warning = warn.mock.calls[0][0];
    expect(warning).toMatch(/apicache/);
    expect(warning).toMatch(/express-sharp/);
});

test('noops and warns if a dep is broken', () => {
    simulate.is('apicache', {
        middleware: jest.fn(() => {
            throw new Error('Cache is broken');
        })
    });
    const expressSharp = simulate.is('@magento/express-sharp', jest.fn());

    const addImgOptMiddleware = require('../addImgOptMiddleware');

    addImgOptMiddleware(app);

    expect(app.use).not.toHaveBeenCalled();
    expect(expressSharp).toHaveBeenCalled();
    const warning = warn.mock.calls[0][0];
    expect(warning).toMatch(/apicache/);
});
