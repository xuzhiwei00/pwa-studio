import React, { useState } from "react"

import { mergeClasses } from "src/classify"
import CreateAccount from "src/components/CreateAccount"
import ForgotPassword from "src/components/ForgotPassword"
import SignIn from "src/components/SignIn"
import defaultClasses from "./authForm.css"

const noop = () => {}

const AuthForm = props => {
    const { showCreateAccount, showForgotPassword, view } = props
    const classes = mergeClasses(defaultClasses, props.classes)
    const [username, setUsername] = useState("")
    let child = null

    if (view === "SIGN_IN") {
        child = (
            <SignIn
                onForgotPassword={showForgotPassword}
                setDefaultUsername={setUsername}
                showCreateAccountForm={showCreateAccount}
            />
        )
    } else if (view === "CREATE_ACCOUNT") {
        child = (
            <CreateAccount
                initialValues={{ email: username }}
                onSubmit={noop}
            />
        )
    } else if (view === "FORGOT_PASSWORD") {
        child = (
            <ForgotPassword
                initialValues={{ email: username }}
                onClose={noop}
            />
        )
    }

    return (
        <div className={classes.root}>
            {child}
        </div>
    )
}

export default AuthForm
