import React, { useCallback, useEffect } from 'react';
import { bool, shape, string } from 'prop-types';
import debounce from 'lodash.debounce';
import { useFieldState } from 'informed';
import { useApolloContext, useQueryResult } from '@magento/peregrine';

import { mergeClasses } from 'src/classify';
import PRODUCT_SEARCH from 'src/queries/productSearch.graphql';
import Suggestions from './suggestions';
import defaultClasses from './autocomplete.css';

const debounceTimeout = 200;

const Autocomplete = props => {
    const { visible } = props;
    const { data, dispatch, error, loading } = useQueryResult();
    const client = useApolloContext();
    const { value } = useFieldState('search_query');
    const classes = mergeClasses(defaultClasses, props.classes);
    const rootClassName = visible ? classes.root_visible : classes.root_hidden;
    const valid = value && value.length > 2;
    let message = '';

    if (error) {
        message = 'An error occurred while fetching results.';
    } else if (loading) {
        message = 'Fetching results...';
    } else if (!data) {
        message = 'Search for a product';
    } else if (!data.products.items.length) {
        message = 'No results were found.';
    } else {
        message = `${data.products.items.length} items`;
    }

    const runQuery = useCallback(
        debounce(inputText => {
            client
                .query({
                    query: PRODUCT_SEARCH,
                    variables: { inputText }
                })
                .then(payload => {
                    dispatch({
                        payload,
                        type: 'receive response'
                    });
                });
        }, debounceTimeout),
        []
    );

    useEffect(() => {
        if (visible && valid) {
            dispatch({
                payload: true,
                type: 'set loading'
            });

            runQuery(value);
        } else if (!value) {
            dispatch({ type: 'reset state' });
        }

        return () => {
            runQuery.cancel();
        };
    }, [valid, value, visible]);

    return (
        <div className={rootClassName}>
            <div className={classes.message}>{message}</div>
            <div className={classes.suggestions}>
                <Suggestions
                    products={data ? data.products : {}}
                    searchValue={value}
                    visible={visible}
                />
            </div>
        </div>
    );
};

export default Autocomplete;

Autocomplete.propTypes = {
    classes: shape({
        message: string,
        root_hidden: string,
        root_visible: string,
        suggestions: string
    }),
    visible: bool
};
