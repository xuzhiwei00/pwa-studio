import React, { Component } from 'react';
import { arrayOf, func, number, shape, string } from 'prop-types';

import classify from 'src/classify';
import Branch from './categoryBranch';
import Leaf from './categoryLeaf';
import defaultClasses from './categoryTree.css';

class Tree extends Component {
    static propTypes = {
        classes: shape({
            leaf: string,
            root: string,
            tree: string
        }),
        nodes: arrayOf(
            shape({
                id: number.isRequired,
                name: string.isRequired,
                position: number.isRequired
            })
        ),
        onNavigate: func,
        rootNodeId: number.isRequired,
        updateRootNodeId: func.isRequired
    };

    get leaves() {
        const { nodes, onNavigate, rootNodeId, updateRootNodeId } = this.props;
        const elements = [];
        console.log(nodes);

        for (const node of nodes) {
            const { children_count, id: nodeId, position } = node;
            const isBranch = parseInt(children_count) > 0;

            const element = isBranch ? (
                <Branch node={node} onDive={updateRootNodeId} />
            ) : (
                <Leaf node={node} onNavigate={onNavigate} />
            );

            elements[position - 1] = <li key={nodeId}>{element}</li>;
        }

        if (nodes[rootNodeId].urlPath) {
            elements.push(
                <li key={rootNodeId}>
                    <Leaf
                        nodeId={rootNodeId}
                        nodes={nodes}
                        onNavigate={onNavigate}
                    >
                        {({ node }) => `All ${node.name}`}
                    </Leaf>
                </li>
            );
        }

        return elements;
    }

    render() {
        const { leaves, props } = this;
        const { classes } = props;

        return (
            <div className={classes.root}>
                <ul className={classes.tree}>{leaves}</ul>
            </div>
        );
    }
}

export default classify(defaultClasses)(Tree);
