import React from 'react';
import { Form, Text } from 'informed';
import { act } from 'react-test-renderer';
import waitForExpect from 'wait-for-expect';
import { useApolloContext, useQueryResult } from '@magento/peregrine';

import createTestInstance from 'src/util/createTestInstance';
import Autocomplete from '../autocomplete';

jest.mock('src/classify');
jest.mock('@magento/peregrine');
jest.mock('../suggestions', () => () => null);
jest.doMock('react-apollo/ApolloContext', () => React.createContext());

const dispatch = jest.fn();
const query = jest.fn(async () => ({}));

useApolloContext.mockImplementation(() => ({
    query
}));

useQueryResult.mockImplementation(() => ({
    data: null,
    dispatch,
    error: null,
    loading: false
}));

test('renders correctly', () => {
    const { root } = createTestInstance(
        <Form>
            <Autocomplete visible={false} />
        </Form>
    );

    expect(root.findByProps({ className: 'root_hidden' })).toBeTruthy();
    expect(root.findByProps({ className: 'message' })).toBeTruthy();
    expect(root.findByProps({ className: 'suggestions' })).toBeTruthy();
});

test('resets query state if not visible', () => {
    createTestInstance(
        <Form>
            <Autocomplete visible={false} />
        </Form>
    );

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenLastCalledWith({
        type: 'reset state'
    });
});

test('resets query state if input is invalid', () => {
    createTestInstance(
        <Form initialValues={{ search_query: '' }}>
            <Autocomplete visible={true} />
        </Form>
    );

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenLastCalledWith({
        type: 'reset state'
    });
});

test('sets loading, runs query, receives response', async () => {
    let formApi;

    createTestInstance(
        <Form
            getApi={api => {
                formApi = api;
            }}
        >
            <Text field="search_query" initialValue="" />
            <Autocomplete visible={true} />
        </Form>
    );

    act(() => {
        formApi.setValue('search_query', 'a');
    });
    act(() => {
        formApi.setValue('search_query', 'ab');
    });
    act(() => {
        formApi.setValue('search_query', 'abc');
    });

    expect(dispatch).toHaveBeenCalledTimes(3);
    expect(dispatch).toHaveBeenNthCalledWith(1, {
        type: 'reset state'
    });
    expect(dispatch).toHaveBeenNthCalledWith(2, {
        type: 'reset state'
    });
    expect(dispatch).toHaveBeenNthCalledWith(3, {
        payload: true,
        type: 'set loading'
    });

    await waitForExpect(() => {
        expect(query).toHaveBeenCalledTimes(1);
        expect(query).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                variables: {
                    inputText: 'abc'
                }
            })
        );

        expect(dispatch).toHaveBeenCalledTimes(4);
        expect(dispatch).toHaveBeenNthCalledWith(4, {
            payload: {},
            type: 'receive response'
        });
    });
});

test('renders a hint message', () => {
    const { root } = createTestInstance(
        <Form>
            <Autocomplete visible={true} />
        </Form>
    );

    expect(root.findByProps({ className: 'message' }).children).toContain(
        'Search for a product'
    );
});

test('renders an error message', () => {
    useQueryResult.mockReturnValueOnce({
        data: null,
        dispatch,
        error: new Error('error'),
        loading: false
    });

    const { root } = createTestInstance(
        <Form>
            <Autocomplete visible={true} />
        </Form>
    );

    expect(root.findByProps({ className: 'message' }).children).toContain(
        'An error occurred while fetching results.'
    );
});

test('renders a loading message', () => {
    useQueryResult.mockReturnValueOnce({
        data: null,
        dispatch,
        error: null,
        loading: true
    });

    const { root } = createTestInstance(
        <Form>
            <Autocomplete visible={true} />
        </Form>
    );

    expect(root.findByProps({ className: 'message' }).children).toContain(
        'Fetching results...'
    );
});

test('renders an empty-set message', () => {
    useQueryResult.mockReturnValueOnce({
        data: {
            products: {
                items: []
            }
        },
        dispatch,
        error: null,
        loading: false
    });

    const { root } = createTestInstance(
        <Form>
            <Autocomplete visible={true} />
        </Form>
    );

    expect(root.findByProps({ className: 'message' }).children).toContain(
        'No results were found.'
    );
});

test('renders a summary message', () => {
    useQueryResult.mockReturnValueOnce({
        data: {
            products: {
                items: { length: 1 }
            }
        },
        dispatch,
        error: null,
        loading: false
    });

    const { root } = createTestInstance(
        <Form>
            <Autocomplete visible={true} />
        </Form>
    );

    expect(root.findByProps({ className: 'message' }).children).toContain(
        '1 items'
    );
});
