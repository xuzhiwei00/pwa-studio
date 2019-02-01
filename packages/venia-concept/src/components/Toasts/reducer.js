import { useReducer } from 'react';

export const initialState = {
    toasts: {}
};

export const reducer = (prevState = initialState, action = {}) => {
    const { type, payload } = action;
    switch (type) {
        case 'add':
            return {
                ...prevState,
                toasts: {
                    ...prevState.toasts,
                    [payload.id]: {
                        id: payload.id,
                        type: payload.type,
                        message: payload.message
                    }
                }
            };
        case 'remove':
            const newState = {
                ...prevState
            };
            delete newState.toasts[payload.id];
            return newState;
        default:
            return prevState;
    }
};

export const useToastsState = () => {
    return useReducer(reducer, initialState);
};
