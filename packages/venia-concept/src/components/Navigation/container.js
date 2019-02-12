import { connect } from 'src/drivers';
import { closeDrawer } from 'src/actions/app';
import catalogActions from 'src/actions/catalog';
import {
    completePasswordReset,
    createAccount,
    getUserDetails,
    resetPassword
} from 'src/actions/user';
import Navigation from './navigation';

const { updateCategories } = catalogActions

const mapStateToProps = ({ catalog, user }) => {
    const { categories, rootCategoryId } = catalog;
    const { currentUser, isSignedIn, forgotPassword } = user;
    const { firstname, email, lastname } = currentUser;

    return {
        categories,
        email,
        firstname,
        forgotPassword,
        isSignedIn,
        lastname,
        rootCategoryId
    };
};

const mapDispatchToProps = {
    updateCategories,
    closeDrawer,
    completePasswordReset,
    createAccount,
    getUserDetails,
    resetPassword
};

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(Navigation);
