import React, { useEffect } from 'react';
import { func, number, objectOf, shape, string } from 'prop-types';

import { mergeClasses } from 'src/classify';
import Branch from './categoryBranch';
import Leaf from './categoryLeaf';
import defaultClasses from './categoryTree.css';

const Tree = props => {
    const {
        categories,
        categoryId,
        onNavigate,
        query,
        setCategoryId,
        updateCategories
    } = props;

    const classes = mergeClasses(defaultClasses, props.classes);
    const rootCategory = categories[categoryId];
    const { children, url_path } = rootCategory || {};
    const { data } = query;

    useEffect(
        () => {
            if (data && data.category) {
                updateCategories(data.category);
            }
        },
        [data]
    );

    const branches = rootCategory
        ? Array.from(children || [], id => (
              <Branch
                  key={id}
                  category={categories[id]}
                  setCategoryId={setCategoryId}
              />
          ))
        : null;

    const leaf =
        rootCategory && url_path ? (
            <Leaf category={rootCategory} onNavigate={onNavigate} />
        ) : null;

    return (
        <div className={classes.root}>
            <ul className={classes.tree}>
                {branches}
                {leaf}
            </ul>
        </div>
    );
};

export default Tree;

Tree.propTypes = {
    categories: objectOf(
        shape({
            id: number.isRequired,
            name: string,
            url_path: string
        })
    ),
    categoryId: number.isRequired,
    classes: shape({
        root: string,
        tree: string
    }),
    onNavigate: func.isRequired,
    query: shape({
        data: shape({
            category: shape({})
        })
    }),
    setCategoryId: func.isRequired,
    updateCategories: func.isRequired
};
