import React, { Component } from 'react';
import { func, number, shape, string } from 'prop-types';

import classify from 'src/classify';
import defaultClasses from './categoryLeaf.css';

class Branch extends Component {
    static propTypes = {
        children: func,
        classes: shape({
            root: string,
            text: string
        }),
        node: shape({
            id: number.isRequired,
            name: string.isRequired
        }).isRequired,
        onDive: func.isRequired
    };

    handleClick = () => {
        const { node, onDive } = this.props;

        onDive(node.id);
    };

    render() {
        const { children, classes, node } = this.props;
        const text = children ? children({ node }) : node.name;

        return (
            <button className={classes.root} onClick={this.handleClick}>
                <span className={classes.text}>{text}</span>
            </button>
        );
    }
}

export default classify(defaultClasses)(Branch);
