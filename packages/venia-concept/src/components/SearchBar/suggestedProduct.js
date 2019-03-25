import React, { Component } from 'react';
import { number, shape, string } from 'prop-types';
import { Price } from '@magento/peregrine';
import classify from 'src/classify';
import { Link, resourceUrl } from 'src/drivers';

import defaultClasses from './suggestedProduct.css';

const productUrlSuffix = '.html';

class SuggestedProduct extends Component {
    static propTypes = {
        url_key: string.isRequired,
        small_image: string.isRequired,
        name: string.isRequired,
        price: shape({
            regularPrice: shape({
                amount: shape({
                    currency: string,
                    value: number
                })
            })
        }).isRequired,
        classes: shape({
            root: string,
            image: string,
            name: string,
            price: string
        })
    };

    render() {
        const { classes, url_key, small_image, name, price } = this.props;

        const uri = resourceUrl(`/${url_key}${productUrlSuffix}`);

        return (
            <Link className={classes.root} to={uri}>
                <span className={classes.image}>
                    <img
                        alt={name}
                        src={resourceUrl(small_image, {
                            type: 'image-product',
                            width: 60
                        })}
                    />
                </span>
                <span className={classes.name}>{name}</span>
                <span className={classes.price}>
                    <Price
                        currencyCode={price.regularPrice.amount.currency}
                        value={price.regularPrice.amount.value}
                    />
                </span>
            </Link>
        );
    }
}

export default classify(defaultClasses)(SuggestedProduct);
