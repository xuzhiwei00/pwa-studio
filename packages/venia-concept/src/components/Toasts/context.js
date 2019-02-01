import React, { createContext, useContext } from 'react';
import { useToastsState } from './reducer';

const ToastsContext = createContext();
const { Consumer, Provider } = ToastsContext;

export default ToastsContext;
export const useToastsStore = () => useContext(ToastsContext)[0];
export const useToastsDispatch = () => useContext(ToastsContext)[1];

export const ToastsProvider = ({ children }) => {
    const store = useToastsState();
    return <Provider value={store}>{children}</Provider>;
};
