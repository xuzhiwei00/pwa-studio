import React, { useCallback, useEffect, useState } from "react"
import { bool, func, number, objectOf, shape, string } from "prop-types"

import { mergeClasses } from "src/classify"
import { Query } from "src/drivers"
import menuQuery from "src/queries/getNavigationMenu.graphql"
import Tree from "./categoryTree"
import NavHeader from "./navHeader"
import defaultClasses from "./navigation.css"

const useNavigationData = (...actions) => useEffect(
    () => {
        for (const action of actions) {
            action()
        }
    },
    actions
)

const ancestors = {
    "createAccount": "signIn",
    "forgotPassword": "signIn",
    "signIn": "menu",
    "menu": null
}

const titles = {
    "createAccount": "Create Account",
    "forgotPassword": "Forgot Password",
    "signIn": "Sign In",
    "menu": "Main Menu"
}

const Navigation = props => {
    const { categories, closeDrawer, getUserDetails, isOpen, rootCategoryId, updateCategories } = props

    // request category & user data
    useNavigationData(getUserDetails)

    // get local state
    const [view, setView] = useState("menu")
    const [categoryId, setCategoryId] = useState(null)

    // update state after receiving response
    useEffect(
        () => {
            if (!categoryId && rootCategoryId != null) {
                setCategoryId(rootCategoryId)
            }
        },
        [categoryId, rootCategoryId]
    )

    // define local variables
    const classes = mergeClasses(defaultClasses, props.classes)
    const rootClassName = isOpen ? classes.root_open : classes.root
    const category = categories[categoryId]
    const isTopLevel = categoryId === rootCategoryId

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
            <div className={classes.body}>
                <Query query={menuQuery} variables={{ id: categoryId }}>
                    {renderTree}
                </Query>
            </div>
            <div className={classes.footer}></div>
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
}
