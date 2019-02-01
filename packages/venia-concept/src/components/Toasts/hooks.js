import { useCallback } from 'react';
import { useToastsDispatch } from './context';

export const useToastActions = () => {
    const dispatch = useToastsDispatch();

    const addToast = useCallback(
        (type, message) => {
            const id = Date.now();

            // Queue to delete the toast after some time.
            setTimeout(() => {
                removeToast(id);
            }, 5000);

            return dispatch({
                type: 'add',
                payload: { id, type, message }
            });
        },
        [dispatch]
    );

    const removeToast = useCallback(
        id =>
            dispatch({
                type: 'remove',
                payload: { id }
            }),
        [dispatch]
    );

    return { addToast, removeToast };
};
