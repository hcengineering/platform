import { Account, AttachedDoc, Class, ClassifierKind, Data, Doc, Domain, Ref, Space, Tx } from '@hcengineering/core'
import { IntlString, plugin, Plugin } from '@hcengineering/platform'
import { createClass } from './minmodel'

export interface TaskComment extends AttachedDoc {
  message: string
  date: Date
}

export enum TaskStatus {
  Open,
  Close,
  Resolved = 100,
  InProgress
}

export enum TaskReproduce {
  Always = 'always',
  Rare = 'rare',
  Sometimes = 'sometimes'
}

export interface Task extends Doc {
  name: string
  description: string
  rate?: number
  status?: TaskStatus
  reproduce?: TaskReproduce
  eta?: TaskEstimate | null
}

/**
 * Define ROM and Estimated Time to arrival
 */
export interface TaskEstimate extends AttachedDoc {
  rom: number // in hours
  eta: number // in hours
}

export interface TaskMixin extends Task {
  textValue?: string
}

export interface TaskWithSecond extends Task {
  secondTask: string | null
}

const taskIds = 'taskIds' as Plugin

export const taskPlugin = plugin(taskIds, {
  class: {
    Task: '' as Ref<Class<Task>>,
    TaskEstimate: '' as Ref<Class<TaskEstimate>>,
    TaskComment: '' as Ref<Class<TaskComment>>
  }
})

/**
 * Create a random task with name specified
 * @param name
 */
export function createTask (name: string, rate: number, description: string): Data<Task> {
  return {
    name,
    description,
    rate
  }
}

export const doc1: Task = {
  _id: 'd1' as Ref<Task>,
  _class: taskPlugin.class.Task,
  name: 'my-space',
  description: 'some-value',
  rate: 20,
  modifiedBy: 'user' as Ref<Account>,
  modifiedOn: 10,
  // createdOn: 10,
  space: '' as Ref<Space>
}

export function createTaskModel (txes: Tx[]): void {
  txes.push(
    createClass(taskPlugin.class.Task, {
      kind: ClassifierKind.CLASS,
      label: 'Task' as IntlString,
      domain: 'test-task' as Domain
    }),
    createClass(taskPlugin.class.TaskEstimate, {
      kind: ClassifierKind.CLASS,
      label: 'Estimate' as IntlString,
      domain: 'test-task' as Domain
    }),
    createClass(taskPlugin.class.TaskComment, {
      kind: ClassifierKind.CLASS,
      label: 'Comment' as IntlString,
      domain: 'test-task' as Domain
    })
  )
}
