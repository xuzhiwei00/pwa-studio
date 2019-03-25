import TestRenderer, { act } from 'react-test-renderer';

export default (...args) => {
    let instance;

    // wrap rendering code in `act()`
    // https://reactjs.org/docs/test-utils.html#act
    act(() => {
        instance = TestRenderer.create(...args);
    });

    return instance;
};
