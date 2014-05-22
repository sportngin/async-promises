/**
 * Restful Resources service for AngularJS apps
 * @version v1.4.0 - 2014-05-22 * @link https://github.com/sportngin/async-promises
 * @author Jesse Houchins <jesse.houchins@sportngin.com>
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */;(function() { 'use strict';


  var module = angular.module('async-promises', [])

  module.factory('AsyncPromises', function($q) {

    function count(obj) {
      var c = 0
      for (var key in obj) { c++ }
      return c
    }

    function Auto(tasks) {
      var dfd = $q.defer()
      this.tasks = tasks = tasks || {}
      this.tasksRemaining = count(tasks)

      // if no tasks, break
      if (!this.tasksRemaining) {
        dfd.resolve()
        return dfd.promise
      }

      this.success = function(data){
        dfd.resolve(data)
      }

      this.error = function(key, err){
        dfd.reject({taskName: key, data: err})
      }

      this.progress = function(key, data){
        tasks[key] = data
        dfd.notify({taskName: key, data: data})
        this.resolveDependency(key)
      }

      angular.forEach(tasks, angular.bind(this, this.setDependencies))
      this.startNonDependentTasks()

      return dfd.promise
    }

    Auto.prototype = {
      setDependencies: function(dependencies, taskKey) {
        var tasks = this.tasks
        var dependency
        var dependents

        // Forces all task to array `[runTask]`
        if (!angular.isArray(dependencies)) tasks[taskKey] = dependencies = [dependencies]

        // Sets callback as task.runTask
        dependencies.runTask = dependencies.pop()

        // Exit if no dependents
        if (!dependencies.length) return

        // Link dependencies
        angular.forEach(dependencies, function(depKey) {
          dependency = tasks[depKey]
          dependents = dependency.dependents = dependency.dependents || []
          dependents.push(dependency)
        })
      },

      resolveDependency: function(key) {
        var completedTask = this.tasks[key]
        this.tasksRemaining--

        if (!this.tasksRemaining) return this.success(this.tasks)

        angular.forEach(this.tasks, function(dependencies, task) {
          var taskIsDone = !dependencies || !dependencies.runTask
          if (taskIsDone) return
          var depIndex = dependencies.indexOf(key)
          if (depIndex !== -1) dependencies.splice(depIndex, 1)
        })
        this.startNonDependentTasks()
      },

      startNonDependentTasks: function() {
        var self = this
        angular.forEach(self.tasks, function(dependencies, key) {
          if (!dependencies || dependencies.length || !dependencies.runTask) return
          var promise = dependencies.runTask()

          // remove the task so it can only run once
          ;delete dependencies.runTask


          // report progress or errors when complete
          if (promise && promise.then) {
            promise.then(
              angular.bind(self, self.progress, key),
              angular.bind(self, self.error, key)
            )
          }

          // or resolve now if non-promise value is returned
          else {
            self.progress(key, promise) 
          }
        })
      }

    }

    // API

    return {
      auto: function(tasks){ return new Auto(tasks) }
    }

  })


})();
