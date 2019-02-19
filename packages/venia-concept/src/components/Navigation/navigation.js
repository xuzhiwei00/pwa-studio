import React, { useCallback, useEffect, useState } from "react"
import { bool, func, number, objectOf, shape, string } from "prop-types"

import { mergeClasses } from "src/classify"
import AuthBar from "src/components/AuthBar"
import AuthForm from "src/components/AuthForm"
import { Query } from "src/drivers"
import menuQuery from "src/queries/getNavigationMenu.graphql"
import Tree from "./categoryTree"
import NavHeader from "./navHeader"
import defaultClasses from "./navigation.css"

const ancestors = {
    "CREATE_ACCOUNT": "SIGN_IN",
    "FORGOT_PASSWORD": "SIGN_IN",
    "SIGN_IN": "MENU",
    "MENU": null
}

const titles = {
    "CREATE_ACCOUNT": "Create Account",
    "FORGOT_PASSWORD": "Forgot Password",
    "SIGN_IN": "Sign In",
    "MENU": "Main Menu"
}

const useAsyncActions = (...actions) => useEffect(
    () => {
        for (const action of actions) {
            action()
        }
    },
    actions
)

const Navigation = props => {
    const { categories, closeDrawer, getUserDetails, isSignedIn, isOpen, rootCategoryId, updateCategories } = props

    // call async actions
    useAsyncActions(getUserDetails)

    // get local state
    const [view, setView] = useState("MENU")
    const [categoryId, setCategoryId] = useState(rootCategoryId)

    // define local variables
    const classes = mergeClasses(defaultClasses, props.classes)
    const rootClassName = isOpen ? classes.root_open : classes.root
    const category = categories[categoryId]
    const isTopLevel = categoryId === rootCategoryId
    const hasModal = view !== "MENU"
    const modalClassName = hasModal ? classes.modal_open : classes.modal
    const bodyClassName = hasModal ? classes.body_masked : classes.body

    // define handlers
    const handleBack = useCallback(
        () => {
            const parent = ancestors[view]

            if (parent) {
                setView(parent)
            } else if (isTopLevel) {
                closeDrawer()
            } else if (category) {
                setCategoryId(category.parentId)
            }
        },
        [category, isTopLevel, view]
    )

    // create callbacks for local state
    const showSignIn = useCallback(
        () => {
            setView("SIGN_IN")
        },
        [setView]
    )
    const showCreateAccount = useCallback(
        () => {
            setView("CREATE_ACCOUNT")
        },
        [setView]
    )
    const showForgotPassword = useCallback(
        () => {
            setView("FORGOT_PASSWORD")
        },
        [setView]
    )

    // define render props
    // TODO: replace with `useQuery` once `react-apollo` exports it
    const renderTree = useCallback(
        query => {
            return categoryId ? (
                <Tree
                    categoryId={categoryId}
                    categories={categories}
                    onNavigate={closeDrawer}
                    query={query}
                    setCategoryId={setCategoryId}
                    updateCategories={updateCategories}
                />
            ) : null
        },
        [categories, categoryId]
    )

    return (
        <aside className={rootClassName}>
            <header className={classes.header}>
                <NavHeader
                    onBack={handleBack}
                    onClose={closeDrawer}
                    title={titles[view]}
                />
            </header>
            <div className={bodyClassName}>
                <Query query={menuQuery} variables={{ id: categoryId }}>
                    {renderTree}
                </Query>
            </div>
            <div className={classes.footer}>
                <AuthBar
                    disabled={hasModal}
                    onSignIn={showSignIn}
                    userIsSignedIn={isSignedIn}
                />
            </div>
            <div className={modalClassName}>
                <AuthForm
                    showCreateAccount={showCreateAccount}
                    showForgotPassword={showForgotPassword}
                    showSignIn={showSignIn}
                    view={view}
                />
            </div>
        </aside>
    )
}

export default Navigation

Navigation.propTypes = {
    categories: objectOf(shape({
        parentId: number,
    })),
    classes: shape({
        authBar: string,
        body: string,
        form_closed: string,
        form_open: string,
        footer: string,
        header: string,
        root: string,
        root_open: string,
        signIn_closed: string,
        signIn_open: string,
    }),
    closeDrawer: func.isRequired,
    getUserDetails: func.isRequired,
    isOpen: bool,
    isSignedIn: bool,
    rootCategoryId: number.isRequired,
    updateCategories: func.isRequired,
}
