import { connect } from 'react-redux';

import { closeDrawer } from 'src/actions/app';
import Navigation from './navigation';

const mapStateToProps = ({ user }) => {
    const { firstname, email, isSignedIn, lastname } = user;

    return {
        firstname,
        email,
        isSignedIn,
        lastname
    };
};

const mapDispatchToProps = { closeDrawer };

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(Navigation);
