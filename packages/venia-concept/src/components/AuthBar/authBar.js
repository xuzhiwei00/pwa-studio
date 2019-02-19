import React, { useCallback } from "react"
import { bool, func, shape, string } from "prop-types"

import { mergeClasses } from "src/classify"
import Button from "src/components/Button"
import defaultClasses from "./authBar.css"

const AuthBar = props => {
    const { disabled, onSignIn, userIsSignedIn } = props
    const classes = mergeClasses(defaultClasses, props.classes)

    const handleClick = useCallback(
        () => {
            onSignIn()
        },
        [onSignIn]
    )

    const child = userIsSignedIn ? (
        <span>
            {"User"}
        </span>
    ) : (
        <Button
            disabled={!!disabled}
            priority="high"
            onClick={handleClick}
        >
            {"Sign In"}
        </Button>
    )

    return (
        <div className={classes.root}>
            {child}
        </div>
    )
}

export default AuthBar

AuthBar.propTypes = {
    classes: shape({
        root: string,
    }),
    disabled: bool,
    onSignIn: func.isRequired,
    userIsSignedIn: bool,
}
