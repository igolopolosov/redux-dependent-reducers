import {Action, ActionCreator} from 'typescript-fsa';

export type IDependency<P> = ActionCreator<P> | DependentReducer<P>;

export interface IDependentReducerFn<S> {
    (state: DeepReadonly<S>, action: Action<any>, ...dependenciesValues: DeepReadonly<any>[]): S;
}

export type DeepReadonly<T> = {
    readonly [P in keyof T]: DeepReadonly<T[P]>;
}

export function createContainer<T>() {
    return new DependentReducers<T>();
}

export class DependentReducers<T> {
    private reducersByActionType: {
        [actionType: string]: DependentReducer<any>[]
    } = {};
    private idCounter = 0;
    private stateIdToKey: {
        [id: number]: string
    };
    private allDependencies: DependentReducer<any>[] = [];

    public createDependency<S, A = any, D = any>(dependencies: (ActionCreator<any> | DependentReducer<any>)[],
                                                 reducerFn: (state: DeepReadonly<S>,
                                                             action: DeepReadonly<Action<A>>,
                                                             ...dependenciesValues: DeepReadonly<D>[]) => S,
                                                 initialState: S): DependentReducer<S> {
        const dependentReducer = new DependentReducer<S>({
            initialState,
            reducerFn,
            dependencies,
            id: this.idCounter++
        });

        this.allDependencies.push(dependentReducer);

        dependentReducer.getRootActionTypes().forEach((actionType) => {
            if (!this.reducersByActionType.hasOwnProperty(actionType)) {
                this.reducersByActionType[actionType] = [];
            }
            this.reducersByActionType[actionType].push(dependentReducer);
        });
        return dependentReducer;
    }

    public combine(stateShape: {
                       [name: string]: DependentReducer<any>
                   }): (state: T, action: Action<any>, ...otherParams: any[]) => T {
        if (this.stateIdToKey) {
            throw new Error('Already initialized');
        }
        this.stateIdToKey = Object.keys(stateShape).reduce((map, key) => {
            map[stateShape[key].id] = key;
            return map;
        }, <any> {});

        let initialState = {};
        this.allDependencies.forEach(dependency => {
            const key = this.stateIdToKey[dependency.id];
            if (key) {
                initialState = {...initialState, [key]: dependency.getCurrentState()};
            }
        });

        return (state: any, action: Action<any>) => {
            if (this.reducersByActionType.hasOwnProperty(action.type)) {
                this.reducersByActionType[action.type].forEach(dependency => {
                    const dependencyState = dependency.run(action);
                    const key = this.stateIdToKey[dependency.id];
                    if (key) {
                        state = {...state, [key]: dependencyState};
                    }
                })
            }
            return state !== undefined
                ? state
                : initialState;
        };
    }
}

interface IDependentReducerState<D> {
    payload: DeepReadonly<D>;
}

export class DependentReducer<D> {
    private currentState: DeepReadonly<D>;
    private previousState: DeepReadonly<D>;
    private reducerFn: (state: DeepReadonly<D>,
                        action: DeepReadonly<Action<any>>,
                        ...dependenciesValues: DeepReadonly<any>[]) => D;
    private rootActionTypes: string[];
    private dependencies: DependentReducer<any>[];
    public readonly id: number;

    constructor(params: {
                    reducerFn: (state: DeepReadonly<D>,
                                action: DeepReadonly<Action<any>>,
                                ...dependenciesValues: DeepReadonly<any>[]) => D;
                    id: number;
                    dependencies: any[];
                    initialState: D;
                }) {
        const {reducerFn, id, dependencies, initialState} = params;
        this.reducerFn = reducerFn;
        this.id = id;
        this.rootActionTypes = getRootActionTypes(dependencies);
        this.dependencies = dependencies.filter(
            dependency => dependency instanceof DependentReducer
        );
        this.currentState = <DeepReadonly<D>> <any> initialState;
    }

    public getRootActionTypes(): string[] {
        return this.rootActionTypes;
    }

    public getCurrentState(): DeepReadonly<D> {
        return this.currentState;
    }

    public getPreviousState(): DeepReadonly<D> {
        return this.previousState;
    }

    public run(action: Action<any>): DeepReadonly<D> {
        this.previousState = this.currentState;
        const depsStates = this.dependencies.map(dep => dep.getCurrentState());
        this.currentState = <any> this.reducerFn(this.previousState, action, ...depsStates);
        return this.currentState;
    }
}

function getRootActionTypes<A, D>(dependencies: (ActionCreator<A> | DependentReducer<D>)[]): string[] {
    return dependencies.reduce((rootActionTypes, currentDependency) => {
        const currentActionTypes = currentDependency instanceof DependentReducer
            ? currentDependency.getRootActionTypes()
            : [currentDependency.type];
        return rootActionTypes.concat(
            currentActionTypes.filter(dependency => rootActionTypes.indexOf(dependency) === -1)
        );
    }, []);
}
