import React from 'react';
import { act } from 'react-test-renderer';
import { shallow } from 'enzyme';
import { Form } from 'informed';

import createTestInstance from 'src/util/createTestInstance';
import SignIn from '../signIn';

const props = {
    signIn: function() {},
    signInError: { message: 'foo' }
};

const classes = {
    signInButton: 'a'
};

test('set state `password` to new `password` on `updatePassword`', () => {
    const wrapper = shallow(
        <SignIn
            signIn={props.signIn}
            signInError={props.signInError}
            onForgotPassword={() => {}}
        />
    ).dive();

    const newPassword = 'foo';

    expect(wrapper.state().password).toEqual('');
    wrapper.instance().updatePassword(newPassword);
    expect(wrapper.state().password).toEqual(newPassword);
});

test('set state `username` to new `username` on `updateUsername`', () => {
    const wrapper = shallow(
        <SignIn
            signIn={props.signIn}
            signInError={props.signInError}
            onForgotPassword={() => {}}
        />
    ).dive();

    const newUsername = 'bar';

    expect(wrapper.state().username).toEqual('');
    wrapper.instance().updateUsername(newUsername);
    expect(wrapper.state().username).toEqual(newUsername);
});

test('display error message if there is a `signInError`', () => {
    const wrapper = shallow(
        <SignIn
            signIn={props.signIn}
            signInError={props.signInError}
            onForgotPassword={() => {}}
        />
    ).dive();

    const errorMessage = shallow(wrapper.instance().errorMessage);
    expect(errorMessage.html()).toContain(props.signInError.message);
});

test('calls `onSignIn` when sign in button is pressed', () => {
    const signIn = jest.fn();
    const onForgotPassword = jest.fn();

    const { root } = createTestInstance(
        <SignIn
            signIn={signIn}
            classes={classes}
            onForgotPassword={onForgotPassword}
        />
    );

    act(() => {
        root.findByType(Form).props.onSubmit();
    });

    expect(signIn).toHaveBeenCalledTimes(1);
});
