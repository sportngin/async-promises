AsyncPromises.js <a name="menu" />
---------------------------------------------------------

[Configuration](#configuration) | [Documentation](#documentation) | [Contributing](#contributing)
---|---|---

### Introduction

AsyncPromises.js is a promise-based asyncronous flow control module for [AngularJS](https://angularjs.org/) based on concepts from the [Async.js](https://github.com/caolan/async) library. However, unlike Async.js, AsyncPromises.js does not use callbacks. Instead, it follows
the proposed [CommonJS Promises/A](http://wiki.commonjs.org/wiki/Promises/A) (and Angular.js) conventions.

#### Promises/A Example

```javascript
promise.then(
  successHandler,
  errorHandler,
  progressHandler
)
```

The Promises/A spec does support chaining, like `promise.then(doSomething).then(doSomethingElse)`, but sometimes you will want a bit more control. This is where flow control methods are useful.

#### Flow Control

Flow control methods run task functions in a specified sequence that is not possible (or not as pretty) with chaining alone. Task functions that return a promise object will complete when the promise is resolved or rejected. Task functions that do not return a promise will resolve immediately, and the next task or task will begin.

Each flow control method may take different arguments, but all will support success, error and progress handlers (when appropriate). Chek the documentation below to see what values are returned to each handler.

----------------------------------------------------------

# Configuration

...

----------------------------------------------------------

# Documentation

### `.auto(tasks)`

Determines the best order for running task functions, based on their requirements. Each task can optionally depend on other tasks being completed first, and each function is run as soon as its requirements are resolved.

As a task completes, its record in the task object is replaced with the task's return value. This allows future tasks to access data from any task that has already completed (by passing in the task object) without requiring the task function to accept specific arguments. Once all task have completed successfully, the `successHandler` will be called with the full results of the flow.

##### Callbacks

- `successHandler(results{})` -- called once all tasks have resolved
- `progressHandler({taskName: key, result: returnValue})` -- called when an individual task is resolved
- `progressHandler({taskName: key, result: returnValue})` -- called if a task is rejected

##### Example

```javascript
AsyncPromises.auto({
  task1: getTask1Data,
  task2: getTask2Data,
  task3: ['task1', 'task2', getTask3Data]
  task4: ['task3', getTask4Data]
})
  
.then(
  handleSuccess, 
  handleError, 
  handleProgress
)
```


----------------------------------------------------------

# Contributing

If you find bugs in this library, or would like to see additional flow control methods added, just [open an issue](https://github.com/sportngin/async-promises/issues) or [submit a pull request](https://github.com/sportngin/async-promises/pulls). 

To run this project locally, follw the instructions below. And if you do decide to contribute code, please be kind and write test.

### Environment Setup

...

### Running Tests

...
