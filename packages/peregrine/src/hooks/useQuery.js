import { useCallback, useMemo } from 'react';

import { useApolloContext } from './useApolloContext';
import { useQueryResult } from './useQueryResult';

export const useQuery = query => {
    const apolloClient = useApolloContext();
    const [queryResultState, queryResultApi] = useQueryResult();
    const { receiveResponse } = queryResultApi;

    const runQuery = useCallback(
        ({ variables }) =>
            apolloClient
                .query({ query, variables })
                .then(payload => receiveResponse(payload)),
        [receiveResponse, query]
    );

    const api = useMemo(
        () => ({
            ...queryResultApi,
            runQuery
        }),
        [queryResultApi, runQuery]
    );

    return [queryResultState, api];
};
