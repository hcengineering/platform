import { Class, Doc, type AnyAttribute, type Association, type Ref } from '@hcengineering/core'
import { ContextId, ProcessFunction } from '.'

export interface Context {
  functions: Ref<ProcessFunction>[]
  attributes: AnyAttribute[]
  nested: Record<string, NestedContext>
  relations: Record<string, RelatedContext>
  executionContext: Record<ContextId, ProcessExecutionContext>
}

export interface NestedContext {
  attribute: AnyAttribute
  attributes: AnyAttribute[]
}

export interface RelatedContext {
  name: string
  association: Ref<Association>
  direction: 'A' | 'B'
  attributes: AnyAttribute[]
}

export interface ProcessExecutionContext {
  name: string
  context: ContextId
  value: SelectedExecutionContext
  attributes: AnyAttribute[]
}

export interface Func {
  func: Ref<ProcessFunction>
  props: Record<string, any>
}

interface BaseSelectedContext {
  type: 'attribute' | 'relation' | 'nested' | 'userRequest' | 'function' | 'context'
  // attribute key
  key: string

  // reduce array function for source obj
  sourceFunction?: Func

  // process one by one
  functions?: Func[]

  fallbackValue?: any
}

export interface SelectedAttribute extends BaseSelectedContext {
  type: 'attribute'
}

export interface SelectedRelation extends BaseSelectedContext {
  type: 'relation'
  name: string
  association: Ref<Association>
  direction: 'A' | 'B'
}

export interface SelectedNested extends BaseSelectedContext {
  type: 'nested'
  path: string // ref attribute key
}

export interface SelectedUserRequest extends BaseSelectedContext {
  type: 'userRequest'
  _class: Ref<Class<Doc>>
  id: ContextId
}

export interface SelectedExecutionContext extends BaseSelectedContext {
  type: 'context'
  id: ContextId
}

export interface SelectedContextFunc extends BaseSelectedContext {
  type: 'function'
  func: Ref<ProcessFunction>
  props: Record<string, any>
}

export type SelectedContext =
  | SelectedAttribute
  | SelectedRelation
  | SelectedNested
  | SelectedUserRequest
  | SelectedContextFunc
  | SelectedExecutionContext
