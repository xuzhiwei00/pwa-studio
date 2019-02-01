import React, { Component, Fragment } from 'react';
import { bool, func, shape, string } from 'prop-types';

import Main from 'src/components/Main';
import Mask from 'src/components/Mask';
import MiniCart from 'src/components/MiniCart';
import Navigation from 'src/components/Navigation';
import OnlineIndicator from 'src/components/OnlineIndicator';

import { ToastContainer } from 'src/components/Toasts';
import { useToastActions } from 'src/components/Toasts/hooks';

import renderRoutes from './renderRoutes';

function App({ app, closeDrawer }) {
    const { addToast } = useToastActions();
    const { drawer, overlay, hasBeenOffline, isOnline } = app;
    const navIsOpen = drawer === 'nav';
    const cartIsOpen = drawer === 'cart';

    if (hasBeenOffline) {
        if (isOnline) {
            addToast('info', 'You are online.');
        } else {
            addToast(
                'error',
                'You are offline. Some features may be unavailable.'
            );
        }
    }

    return (
        <Fragment>
            <Main isMasked={overlay}>
                <ToastContainer />
                {renderRoutes()}
            </Main>
            <Mask isActive={overlay} dismiss={closeDrawer} />
            <Navigation isOpen={navIsOpen} />
            <MiniCart isOpen={cartIsOpen} />
        </Fragment>
    );
}

App.propTypes = {
    app: shape({
        drawer: string,
        overlay: bool.isRequired
    }).isRequired,
    closeDrawer: func.isRequired
};

export default App;
