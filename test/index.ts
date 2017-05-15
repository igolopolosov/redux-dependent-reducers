import {test} from 'ava';
import {createContainer} from "../lib/index";
import {Action} from "typescript-fsa";
const fsa = require('typescript-fsa');

const isType = fsa.isType;

const container = createContainer();
const createAction = fsa.default();
const plus = createAction('PLUS');
const minus = createAction('MINUS');
const multiply = createAction('MULTIPLY');

test('initial', t => {
    const plusOrMinus = container.createDependency<number>([plus, minus], (state = 0, action) => {
        if (isType(action, plus)) {
            return state + action.payload;
        } else if (isType(action, minus)) {
            return state - action.payload;
        }
        return state;
    }, 0);

    const multiplyOrDivide = container.createDependency<number>([multiply], (state, action: Action<number>) => {
        return state * action.payload;
    }, 1);

    const sumAllOperators = container.createDependency<number>([plusOrMinus, multiplyOrDivide],
        (state, action, plusOrMinusValue: number, multiplyOrDivideValue: number) => {
            if (state > 100) {
                throw Error();
            }
            if (isType(action, plus) || isType(action, minus)) {
                return state + plusOrMinusValue;
            } else if (isType(action, multiply)) {
                return state + multiplyOrDivideValue;
            }
            return state;
        }, 0);

    interface IState {
        plusOrMinus: number,
        multiplyOrDivide: number,
        sumAllOperators: number,
    }

    const reducer = container.combine({
        plusOrMinus,
        multiplyOrDivide,
        sumAllOperators,
    });

    const store = require('redux').createStore(reducer, {});

    store.dispatch(plus(5));
    t.is(store.getState().plusOrMinus, 5);
    store.dispatch(minus(1));
    t.is(store.getState().plusOrMinus, 4);
    store.dispatch(minus(1));
    t.is(store.getState().plusOrMinus, 3);
    store.dispatch(multiply(100));
    t.is(store.getState().multiplyOrDivide, 100);
    t.is(store.getState().sumAllOperators, 112);

    const prevState = store.getState();
    try {
        store.dispatch(plus(100));
    } catch (e) {
        // testing transactions
    }
    t.deepEqual(store.getState(), prevState);
    t.pass();
});