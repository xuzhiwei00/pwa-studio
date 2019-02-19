import { connect } from 'src/drivers';
import {
    completePasswordReset,
    createAccount,
    getUserDetails,
    resetPassword
} from 'src/actions/user';
import AuthBar from './AuthBar';

const mapStateToProps = ({ user }) => {
    const { currentUser, forgotPassword, isSignedIn } = user;
    const { email, firstname, lastname } = currentUser;

    return {
        email,
        firstname,
        forgotPassword,
        isSignedIn,
        lastname
    };
};

const mapDispatchToProps = {
    completePasswordReset,
    createAccount,
    getUserDetails,
    resetPassword
};

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(AuthBar);
