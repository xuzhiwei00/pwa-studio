import React, { useCallback } from 'react';
import { func, number, shape, string } from 'prop-types';

import { mergeClasses } from 'src/classify';
import defaultClasses from './categoryBranch.css';

const Branch = props => {
    const { category, setCategoryId } = props;
    const { id, name } = category;
    const classes = mergeClasses(defaultClasses, props.classes);

    const handleClick = useCallback(
        () => {
            setCategoryId(id);
        },
        [id, setCategoryId]
    );

    return (
        <li className={classes.root}>
            <button
                className={classes.target}
                type="button"
                onClick={handleClick}
            >
                <span className={classes.text}>{name}</span>
            </button>
        </li>
    );
};

export default Branch;

Branch.propTypes = {
    category: shape({
        id: number.isRequired,
        name: string.isRequired,
        parentId: number,
        position: number,
        url_path: string
    }).isRequired,
    setCategoryId: func.isRequired
};
