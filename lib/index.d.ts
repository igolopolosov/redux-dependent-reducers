import { Action, ActionCreator } from 'typescript-fsa';
export declare type IDependency<P> = ActionCreator<P> | DependentReducer<P>;
export interface IDependentReducerFn<S> {
    (state: DeepReadonly<S>, action: Action<any>, ...dependenciesValues: DeepReadonly<any>[]): S;
}
export declare type DeepReadonly<T> = {
    readonly [P in keyof T]: DeepReadonly<T[P]>;
};
export declare function createContainer<T>(): DependentReducers<T>;
export declare class DependentReducers<T> {
    private reducersByActionType;
    private idCounter;
    private stateIdToKey;
    private allDependencies;
    createDependency<S, A = any, D = any>(dependencies: (ActionCreator<any> | DependentReducer<any>)[], reducerFn: (state: DeepReadonly<S>, action: DeepReadonly<Action<A>>, ...dependenciesValues: DeepReadonly<D>[]) => S, initialState: S): DependentReducer<S>;
    combine(stateShape: {
        [name: string]: DependentReducer<any>;
    }): (state: T, action: Action<any>, ...otherParams: any[]) => T;
}
export declare class DependentReducer<D> {
    private currentState;
    private previousState;
    private reducerFn;
    private rootActionTypes;
    private dependencies;
    readonly id: number;
    constructor(params: {
        reducerFn: (state: DeepReadonly<D>, action: DeepReadonly<Action<any>>, ...dependenciesValues: DeepReadonly<any>[]) => D;
        id: number;
        dependencies: any[];
        initialState: D;
    });
    getRootActionTypes(): string[];
    getCurrentState(): DeepReadonly<D>;
    getPreviousState(): DeepReadonly<D>;
    run(action: Action<any>): DeepReadonly<D>;
}
