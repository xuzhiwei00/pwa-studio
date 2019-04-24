import { useCallback, useMemo } from 'react';
import debounce from 'lodash.debounce';

import { useApolloContext } from './useApolloContext';
import { useQueryResult } from './useQueryResult';

export const useQuery = (query, wait = 0) => {
    const apolloClient = useApolloContext();
    const [queryResultState, queryResultApi] = useQueryResult();
    const { receiveResponse } = queryResultApi;

    // define a debounced callback that performs a query
    // either as an effect or in response to user interaction
    const runQuery = useCallback(
        debounce(async ({ variables }) => {
            const payload = await apolloClient.query({ query, variables });
            receiveResponse(payload);
        }, wait),
        [receiveResponse, query, wait]
    );

    // this object should never change
    const api = useMemo(
        () => ({
            ...queryResultApi,
            runQuery
        }),
        [queryResultApi, runQuery]
    );

    return [queryResultState, api];
};
