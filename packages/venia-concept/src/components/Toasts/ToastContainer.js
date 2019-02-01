import React from 'react';
import { useToastsContext, useToastsStore } from './context';
import classify from 'src/classify';

import defaultClasses from './toasts.css';

function ToastContainer() {
    const { toasts } = useToastsStore();

    const toastList = Object.keys(toasts).map(toastKey => {
        const toast = toasts[toastKey];
        return (
            <Toast key={toast.id} type={toast.type} message={toast.message} />
        );
    });

    return <div className="toast-container">{toastList}</div>;
}

function Toast(props) {
    return <div className={`toast ${props.type}`}>{props.message}</div>;
}

export default classify(defaultClasses)(ToastContainer);
