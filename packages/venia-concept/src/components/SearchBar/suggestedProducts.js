import React from 'react';
import { arrayOf, number, oneOfType, shape, string } from 'prop-types';

import { mergeClasses } from 'src/classify';
import mapProduct from './mapProduct';
import SuggestedProduct from './suggestedProduct';
import defaultClasses from './suggestedProducts.css';

const SuggestedProducts = props => {
    const { limit, products } = props;
    const classes = mergeClasses(defaultClasses, props.classes);

    const items = products.slice(0, limit).map(product => (
        <li key={product.id} className={classes.item}>
            <SuggestedProduct {...mapProduct(product)} />
        </li>
    ));

    return <ul className={classes.root}>{items}</ul>;
};

export default SuggestedProducts;

SuggestedProducts.defaultProps = {
    limit: 3
};

SuggestedProducts.propTypes = {
    classes: shape({
        item: string,
        root: string
    }),
    limit: number.isRequired,
    products: arrayOf(
        shape({
            id: oneOfType([number, string]).isRequired
        })
    ).isRequired
};
