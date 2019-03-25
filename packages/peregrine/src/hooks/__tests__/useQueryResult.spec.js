import React from 'react';
import { act } from 'react-test-renderer';

import { useQueryResult } from '../useQueryResult';
import createTestInstance from '../../util/createTestInstance';

const log = jest.fn();

const Component = () => {
    const hookProps = useQueryResult();

    log(hookProps);

    return <i />;
};

test('returns state and a `dispatch` function', () => {
    createTestInstance(<Component />);

    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenNthCalledWith(1, {
        data: null,
        dispatch: expect.any(Function),
        error: null,
        loading: false
    });
});

test('handles `set data` action', () => {
    createTestInstance(<Component />);

    const payload = {};
    const { dispatch } = log.mock.calls[0][0];

    act(() => {
        dispatch({
            payload,
            type: 'set data'
        });
    });

    expect(log).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenNthCalledWith(2, {
        data: payload,
        dispatch,
        error: null,
        loading: false
    });
});

test('handles `set error` action', () => {
    createTestInstance(<Component />);

    const payload = new Error('foo');
    const { dispatch } = log.mock.calls[0][0];

    act(() => {
        dispatch({
            payload,
            type: 'set error'
        });
    });

    expect(log).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenNthCalledWith(2, {
        data: null,
        dispatch,
        error: payload,
        loading: false
    });
});

test('handles `set loading` action', () => {
    createTestInstance(<Component />);

    const { dispatch } = log.mock.calls[0][0];

    act(() => {
        dispatch({
            payload: true,
            type: 'set loading'
        });
    });

    expect(log).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenNthCalledWith(2, {
        data: null,
        dispatch,
        error: null,
        loading: true
    });
});

test('handles `receive response` action with data', () => {
    createTestInstance(<Component />);

    const data = {};
    const payload = { data };
    const { dispatch } = log.mock.calls[0][0];

    act(() => {
        dispatch({
            payload,
            type: 'receive response'
        });
    });

    expect(log).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenNthCalledWith(2, {
        data,
        dispatch,
        error: null,
        loading: false
    });
});

test('handles `receive response` action with error', () => {
    createTestInstance(<Component />);

    const error = new Error('foo');
    const payload = { error };
    const { dispatch } = log.mock.calls[0][0];

    act(() => {
        dispatch({
            payload,
            type: 'receive response'
        });
    });

    expect(log).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenNthCalledWith(2, {
        data: null,
        dispatch,
        error,
        loading: false
    });
});

test('handles `reset state` action', () => {
    createTestInstance(<Component />);

    const { dispatch } = log.mock.calls[0][0];

    act(() => {
        dispatch({
            payload: {},
            type: 'set data'
        });
    });

    act(() => {
        dispatch({
            payload: new Error('foo'),
            type: 'set error'
        });
    });

    act(() => {
        dispatch({
            payload: true,
            type: 'set loading'
        });
    });

    act(() => {
        dispatch({
            type: 'reset state'
        });
    });

    expect(log).toHaveBeenCalledTimes(5);
    expect(log).toHaveBeenNthCalledWith(5, {
        data: null,
        dispatch,
        error: null,
        loading: false
    });
});

test('handles an unexpected action as a noop', () => {
    createTestInstance(<Component />);

    const { dispatch } = log.mock.calls[0][0];

    act(() => {
        dispatch({
            type: 'foo'
        });
    });

    expect(log).toHaveBeenCalledTimes(1);
});
