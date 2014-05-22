describe('AsyncPromises', function () {
  var scope
  var TR
  var $q
  var success
  var error

  // Resets angular promises. Need to run this beore each
  // test and when promises need to be resolved.
  function clearBuffer(silent) {
    try { scope.$root.$digest() } catch (e){ if (!silent) console.error(e) }
  }

  function MockTasks() {
    clearBuffer()
    this.tasks = []
    this.dfds = []
  }

  MockTasks.prototype = {
    newTask: function(opts) {
      var mock = this
      var dfd = $q.defer()
      var taskNum = this.tasks.length + 1

      opts = opts || {}

      // return promise
      var task = jasmine.createSpy("Task " + taskNum).and.callFake(function() {
        return dfd.promise
      })

      // fake resolve with data
      // `rejectData` is passed in from the $q implementation
      // of `reject` so it needs to be persisted or reject fails.
      var _resolve = dfd.resolve
      dfd.resolve = function(rejectData) {
        _resolve.call(dfd, rejectData || opts.resolveWith)
      }

      // fake reject with data
      dfd.reject = dfd.reject.bind(dfd, opts.rejectWith)

      // fake notify with data
      dfd.notify = dfd.reject.bind(dfd, opts.notifyWith)

      mock.dfds.push(dfd)
      this.tasks.push(task)
      return task
    },
    task: function(num) {
      return this.tasks[num-1]
    },
    resolveTask: function(num) {
      this.dfds[num-1].resolve()
      clearBuffer()
    },
    rejectTask: function(num) {
      this.dfds[num-1].reject()
      clearBuffer()
    }
  }

  beforeEach(module('async-promises'))
  beforeEach(inject(function($injector) {
    scope = $injector.get('$rootScope')
    clearBuffer(true)
    TR = $injector.get('AsyncPromises')
    $q = $injector.get('$q')
  }))

  describe('.auto()', function () {

    beforeEach(function() {
      success = jasmine.createSpy("success")
      error = jasmine.createSpy("error")
    })

    it('should run success if no tasks are provided', function() {
      TR.auto().then(success, error)

      clearBuffer() // force next tick

      expect(success).toHaveBeenCalled()
      expect(error).not.toHaveBeenCalled()
    })

    it('should run success if a task does not return a promise', function() {
      TR.auto({
        task: function(){}
      })
      .then(success, error)

      clearBuffer() // force next tick

      expect(success).toHaveBeenCalled()
      expect(error).not.toHaveBeenCalled()
    })

    it('should run non-dependent tasks in parallel', function() {
      var mock = new MockTasks()
      var tasks = {
        task1: mock.newTask(),
        task2: mock.newTask()
      }
      
      TR.auto(tasks)

      expect(mock.task(1)).toHaveBeenCalled()
      expect(mock.task(2)).toHaveBeenCalled()

    })

    it('should run dependent tasks in series', function() {
      var mock = new MockTasks()
      var tasks = {
        task1: mock.newTask(),
        task2: ['task1', mock.newTask()]
      }
      
      TR.auto(tasks)

      expect(mock.task(1)).toHaveBeenCalled()
      expect(mock.task(2)).not.toHaveBeenCalled()

      mock.resolveTask(1)
      expect(mock.task(2)).toHaveBeenCalled()
    })

    it('should run tasks with nested dependencies', function() {
      var mock = new MockTasks()
      var tasks = {
        task1: mock.newTask(),
        task2: mock.newTask(),
        task3: ['task1', mock.newTask()],
        task4: ['task2', 'task3', mock.newTask()]
      }
      
      TR.auto(tasks)

      expect(mock.task(1)).toHaveBeenCalled()
      expect(mock.task(2)).toHaveBeenCalled()
      expect(mock.task(3)).not.toHaveBeenCalled()
      expect(mock.task(4)).not.toHaveBeenCalled()

      mock.resolveTask(1)
      expect(mock.task(3)).toHaveBeenCalled()

      mock.resolveTask(2)
      expect(mock.task(4)).not.toHaveBeenCalled()

      mock.resolveTask(3)
      expect(mock.task(4)).toHaveBeenCalled()
    })

    it('should run success once all tasks complete', function() {
      var mock = new MockTasks()
      var tasks = {
        task1: mock.newTask(),
        task2: mock.newTask(),
        task3: ['task1', mock.newTask()],
        task4: ['task2', 'task3', mock.newTask()]
      }
      
      TR.auto(tasks).then(success, error)

      mock.resolveTask(1)
      clearBuffer() // force next tick
      expect(success).not.toHaveBeenCalled()

      mock.resolveTask(2)
      clearBuffer() // force next tick
      expect(success).not.toHaveBeenCalled()

      mock.resolveTask(3)
      clearBuffer() // force next tick
      expect(success).not.toHaveBeenCalled()

      mock.resolveTask(4)
      clearBuffer() // force next tick
      expect(success).toHaveBeenCalled()
      expect(error).not.toHaveBeenCalled()
    })


    it('should run error as soon as any task fails', function() {
      var mock = new MockTasks()
      var tasks = {
        task1: mock.newTask(),
        task2: mock.newTask(),
        task3: ['task1', mock.newTask()],
        task4: ['task2', 'task3', mock.newTask()]
      }
      
      TR.auto(tasks).then(success, error)

      mock.resolveTask(1)
      mock.resolveTask(2)
      mock.rejectTask(3)
      clearBuffer() // force next tick

      expect(success).not.toHaveBeenCalled()
      expect(error).toHaveBeenCalled()
      expect(mock.task(4)).not.toHaveBeenCalled()
    })

    it('should only run error once if multiple tasks fail', function() {
      var mock = new MockTasks()
      var tasks = {
        task1: mock.newTask(),
        task2: mock.newTask(),
        task3: mock.newTask(),
      }
      
      TR.auto(tasks).then(success, error)

      mock.resolveTask(1)
      mock.rejectTask(2)
      clearBuffer() // force next tick

      mock.rejectTask(3)
      clearBuffer() // force next tick

      expect(error.calls.count()).toEqual(1)
      expect(success).not.toHaveBeenCalled()
    })

    it('should report progress as each task completes', function() {
      var mock = new MockTasks()
      var progress = jasmine.createSpy("progress")
      var tasks = {
        task1: mock.newTask(),
        task2: mock.newTask(),
        task3: mock.newTask(),
      }
      
      TR.auto(tasks).then(success, error, progress)

      mock.resolveTask(1)
      clearBuffer() // force next tick
      expect(progress.calls.count()).toEqual(1)

      mock.resolveTask(2)
      clearBuffer() // force next tick
      expect(progress.calls.count()).toEqual(2)

      mock.resolveTask(3)
      clearBuffer() // force next tick
      expect(progress.calls.count()).toEqual(3)
    })

    it('should call the `progressHandler(key, data)`', function() {
      var mock = new MockTasks()
      var progress = jasmine.createSpy("progress")

      var task1Data = {a:1}
      var task2Data // undefined on purpose
      var task3Data = [1,2,3]

      var tasks = {
        task1: mock.newTask({resolveWith: task1Data}),
        task2: mock.newTask({resolveWith: task2Data}),
        task3: mock.newTask({resolveWith: task3Data})
      }
      
      TR.auto(tasks).then(success, error, progress)

      mock.resolveTask(1) 
      clearBuffer() // force next tick
      expect(progress.calls.argsFor(0)[0].taskName).toEqual('task1')
      expect(progress.calls.argsFor(0)[0].data).toEqual(task1Data)

      mock.resolveTask(2)
      clearBuffer() // force next tick
      expect(progress.calls.argsFor(1)[0].taskName).toEqual('task2')
      expect(progress.calls.argsFor(1)[0].data).toEqual(task2Data)

      mock.resolveTask(3)
      clearBuffer() // force next tick
      expect(progress.calls.argsFor(2)[0].taskName).toEqual('task3')
      expect(progress.calls.argsFor(2)[0].data).toEqual(task3Data)
    })

  })

})
