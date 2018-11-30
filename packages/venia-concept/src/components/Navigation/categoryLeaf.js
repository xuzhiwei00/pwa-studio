import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { func, number, shape, string } from 'prop-types';

import classify from 'src/classify';
import defaultClasses from './categoryLeaf.css';

const urlSuffix = '.html';

class Leaf extends Component {
    static propTypes = {
        children: func,
        classes: shape({
            root: string,
            text: string
        }),
        node: shape({
            id: number.isRequired,
            name: string.isRequired
        }),
        onNavigate: func
    };

    handleClick = () => {
        const { onNavigate } = this.props;

        if (typeof onNavigate === 'function') {
            onNavigate();
        }
    };

    render() {
        const { children, classes, node } = this.props;
        const text = children ? children({ node }) : node.name;

        return (
            <Link
                className={classes.root}
                to={`/${node.url_path}${urlSuffix}`}
                onClick={this.handleClick}
            >
                <span className={classes.text}>{text}</span>
            </Link>
        );
    }
}

export default classify(defaultClasses)(Leaf);
