"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
function createContainer() {
    return new DependentReducers();
}
exports.createContainer = createContainer;
var DependentReducers = (function () {
    function DependentReducers() {
        this.reducersByActionType = {};
        this.idCounter = 0;
        this.allDependencies = [];
    }
    DependentReducers.prototype.createDependency = function (dependencies, reducerFn, initialState) {
        var _this = this;
        var dependentReducer = new DependentReducer({
            initialState: initialState,
            reducerFn: reducerFn,
            dependencies: dependencies,
            id: this.idCounter++
        });
        this.allDependencies.push(dependentReducer);
        dependentReducer.getRootActionTypes().forEach(function (actionType) {
            if (!_this.reducersByActionType.hasOwnProperty(actionType)) {
                _this.reducersByActionType[actionType] = [];
            }
            _this.reducersByActionType[actionType].push(dependentReducer);
        });
        return dependentReducer;
    };
    DependentReducers.prototype.combine = function (stateShape) {
        var _this = this;
        if (this.stateIdToKey) {
            throw new Error('Already initialized');
        }
        this.stateIdToKey = Object.keys(stateShape).reduce(function (map, key) {
            map[stateShape[key].id] = key;
            return map;
        }, {});
        var initialState = {};
        this.allDependencies.forEach(function (dependency) {
            var key = _this.stateIdToKey[dependency.id];
            if (key) {
                initialState = __assign({}, initialState, (_a = {}, _a[key] = dependency.getCurrentState(), _a));
            }
            var _a;
        });
        return function (state, action) {
            if (_this.reducersByActionType.hasOwnProperty(action.type)) {
                _this.reducersByActionType[action.type].forEach(function (dependency) {
                    var dependencyState = dependency.run(action);
                    var key = _this.stateIdToKey[dependency.id];
                    if (key) {
                        state = __assign({}, state, (_a = {}, _a[key] = dependencyState, _a));
                    }
                    var _a;
                });
            }
            return state !== undefined
                ? state
                : initialState;
        };
    };
    return DependentReducers;
}());
exports.DependentReducers = DependentReducers;
var DependentReducer = (function () {
    function DependentReducer(params) {
        var reducerFn = params.reducerFn, id = params.id, dependencies = params.dependencies, initialState = params.initialState;
        this.reducerFn = reducerFn;
        this.id = id;
        this.rootActionTypes = getRootActionTypes(dependencies);
        this.dependencies = dependencies.filter(function (dependency) { return dependency instanceof DependentReducer; });
        this.currentState = initialState;
    }
    DependentReducer.prototype.getRootActionTypes = function () {
        return this.rootActionTypes;
    };
    DependentReducer.prototype.getCurrentState = function () {
        return this.currentState;
    };
    DependentReducer.prototype.getPreviousState = function () {
        return this.previousState;
    };
    DependentReducer.prototype.run = function (action) {
        this.previousState = this.currentState;
        var depsStates = this.dependencies.map(function (dep) { return dep.getCurrentState(); });
        this.currentState = this.reducerFn.apply(this, [this.previousState, action].concat(depsStates));
        return this.currentState;
    };
    return DependentReducer;
}());
exports.DependentReducer = DependentReducer;
function getRootActionTypes(dependencies) {
    return dependencies.reduce(function (rootActionTypes, currentDependency) {
        var currentActionTypes = currentDependency instanceof DependentReducer
            ? currentDependency.getRootActionTypes()
            : [currentDependency.type];
        return rootActionTypes.concat(currentActionTypes.filter(function (dependency) { return rootActionTypes.indexOf(dependency) === -1; }));
    }, []);
}
