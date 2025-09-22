//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import core, { ArrOf, checkMixinKey, Doc, getObjectValue, RefTo } from '@hcengineering/core'
import { getEmbeddedLabel, getResource } from '@hcengineering/platform'
import process, {
  Execution,
  ExecutionError,
  parseContext,
  ProcessError,
  processError,
  SelectedContext,
  SelectedContextFunc,
  SelectedExecutionContext,
  SelectedNested,
  SelectedRelation,
  SelectedUserRequest
} from '@hcengineering/process'
import serverProcess, { ProcessControl } from '@hcengineering/server-process'

export async function getContextValue (value: any, control: ProcessControl, execution: Execution): Promise<any> {
  const context = parseContext(value)
  if (context !== undefined) {
    let value: any | undefined
    try {
      if (context.type === 'attribute') {
        value = getAttributeValue(control, execution, context)
      } else if (context.type === 'relation') {
        value = await getRelationValue(control, execution, context)
      } else if (context.type === 'nested') {
        value = await getNestedValue(control, execution, context)
      } else if (context.type === 'userRequest') {
        value = getUserRequestValue(control, execution, context)
      } else if (context.type === 'function') {
        value = await getFunctionValue(control, execution, context)
      } else if (context.type === 'context') {
        value = await getExecutionContextValue(control, execution, context)
      }
      return await fillValue(value, context, control, execution)
    } catch (err: any) {
      if (err instanceof ProcessError && context.fallbackValue !== undefined) {
        return await fillValue(context.fallbackValue, context, control, execution)
      }
      throw err
    }
  } else if (typeof value === 'object' && !Array.isArray(value)) {
    for (const key in value) {
      value[key] = await getContextValue(value[key], control, execution)
    }
    return value
  } else {
    return value
  }
}

function getValue (control: ProcessControl, execution: Execution, rawKey: string, card: Doc): any {
  const hierarchy = control.client.getHierarchy()
  const _process = control.client.getModel().findObject(execution.process)
  if (_process === undefined) throw processError(process.error.ObjectNotFound, { _id: execution.process })
  const key = checkMixinKey(rawKey, _process.masterTag, hierarchy)
  return getObjectValue(key, card)
}

function getAttributeValue (control: ProcessControl, execution: Execution, context: SelectedContext): any {
  const card = control.cache.get(execution.card)
  if (card !== undefined) {
    const val = getValue(control, execution, context.key, card)
    if (val == null) {
      const attr = control.client.getHierarchy().findAttribute(card._class, context.key)
      throw processError(
        process.error.EmptyAttributeContextValue,
        {},
        { attr: attr?.label ?? getEmbeddedLabel(context.key) }
      )
    }
    return val
  } else {
    throw processError(process.error.ObjectNotFound, { _id: execution.card }, {}, true)
  }
}

async function fillValue (
  value: any,
  context: SelectedContext,
  control: ProcessControl,
  execution: Execution
): Promise<any> {
  for (const func of context.functions ?? []) {
    const transform = control.client.getModel().findObject(func.func)
    if (transform === undefined) throw processError(process.error.MethodNotFound, { methodId: func.func }, {}, true)
    if (!control.client.getHierarchy().hasMixin(transform, serverProcess.mixin.FuncImpl)) {
      throw processError(process.error.MethodNotFound, { methodId: func.func }, {}, true)
    }
    const funcImpl = control.client.getHierarchy().as(transform, serverProcess.mixin.FuncImpl)
    const f = await getResource(funcImpl.func)
    value = await f(value, func.props, control, execution)
  }
  return value
}

async function getNestedValue (
  control: ProcessControl,
  execution: Execution,
  context: SelectedNested
): Promise<any | ExecutionError> {
  const card = control.cache.get(execution.card)
  if (card === undefined) throw processError(process.error.ObjectNotFound, { _id: execution.card }, {}, true)
  const attr = control.client.getHierarchy().findAttribute(card._class, context.path)
  if (attr === undefined) throw processError(process.error.AttributeNotExists, { key: context.path })
  const nestedValue = getValue(control, execution, context.path, card)
  if (nestedValue === undefined) throw processError(process.error.EmptyAttributeContextValue, {}, { attr: attr.label })
  const parentType = attr.type._class === core.class.ArrOf ? (attr.type as ArrOf<Doc>).of : attr.type
  const targetClass = parentType._class === core.class.RefTo ? (parentType as RefTo<Doc>).to : parentType._class
  const target = await control.client.findAll(targetClass, {
    _id: { $in: Array.isArray(nestedValue) ? nestedValue : [nestedValue] }
  })
  if (target.length === 0) throw processError(process.error.RelatedObjectNotFound, {}, { attr: attr.label })
  const nested = control.client.getHierarchy().findAttribute(targetClass, context.key)
  if (context.sourceFunction !== undefined) {
    const transform = control.client.getModel().findObject(context.sourceFunction.func)
    if (transform === undefined) {
      throw processError(process.error.MethodNotFound, { methodId: context.sourceFunction.func }, {}, true)
    }
    if (!control.client.getHierarchy().hasMixin(transform, serverProcess.mixin.FuncImpl)) {
      throw processError(process.error.MethodNotFound, { methodId: context.sourceFunction.func }, {}, true)
    }
    const funcImpl = control.client.getHierarchy().as(transform, serverProcess.mixin.FuncImpl)
    const f = await getResource(funcImpl.func)
    const reduced = await f(target, {}, control, execution)
    const val = Array.isArray(reduced)
      ? reduced.map((v) => getValue(control, execution, context.key, v))
      : getValue(control, execution, context.key, reduced)
    if (val == null) {
      throw processError(
        process.error.EmptyRelatedObjectValue,
        {},
        { parent: attr.label, attr: nested?.label ?? getEmbeddedLabel(context.key) }
      )
    }
    return val
  }
  const val =
    Array.isArray(target) && target.length > 1
      ? target.map((v) => getValue(control, execution, context.key, v))
      : getValue(control, execution, context.key, target[0])
  if (val == null) {
    throw processError(
      process.error.EmptyRelatedObjectValue,
      {},
      { parent: attr.label, attr: nested?.label ?? getEmbeddedLabel(context.key) }
    )
  }
  return val
}

async function getRelationValue (
  control: ProcessControl,
  execution: Execution,
  context: SelectedRelation
): Promise<any> {
  const assoc = control.client.getModel().findObject(context.association)
  if (assoc === undefined) throw processError(process.error.RelationNotExists, {})
  const targetClass = context.direction === 'A' ? assoc.classA : assoc.classB
  const q = context.direction === 'A' ? { docB: execution.card } : { docA: execution.card }
  const relations = await control.client.findAll(core.class.Relation, { association: assoc._id, ...q })
  const name = context.direction === 'A' ? assoc.nameA : assoc.nameB
  if (relations.length === 0) throw processError(process.error.RelatedObjectNotFound, { attr: name })
  const ids = relations.map((it) => {
    return context.direction === 'A' ? it.docA : it.docB
  })
  const target = await control.client.findAll(targetClass, { _id: { $in: ids } })
  if (target.length === 0) throw processError(process.error.RelatedObjectNotFound, { attr: context.name })
  const attr = context.key !== '' ? control.client.getHierarchy().findAttribute(targetClass, context.key) : undefined
  if (context.sourceFunction !== undefined) {
    const transform = control.client.getModel().findObject(context.sourceFunction.func)
    if (transform === undefined) {
      throw processError(process.error.MethodNotFound, { methodId: context.sourceFunction.func }, {}, true)
    }
    if (!control.client.getHierarchy().hasMixin(transform, serverProcess.mixin.FuncImpl)) {
      throw processError(process.error.MethodNotFound, { methodId: context.sourceFunction.func }, {}, true)
    }
    const funcImpl = control.client.getHierarchy().as(transform, serverProcess.mixin.FuncImpl)
    const f = await getResource(funcImpl.func)
    const reduced = await f(target, {}, control, execution)
    const val = Array.isArray(reduced)
      ? reduced.map((v) => getValue(control, execution, context.key, v))
      : getValue(control, execution, context.key, reduced)
    if (val == null) {
      throw processError(
        process.error.EmptyRelatedObjectValue,
        { parent: name },
        { attr: attr?.label ?? getEmbeddedLabel(context.name) }
      )
    }
    return val
  }
  const val =
    Array.isArray(target) && target.length > 1
      ? target.map((v) => getValue(control, execution, context.key, v))
      : getValue(control, execution, context.key, target[0])
  if (val == null) {
    throw processError(
      process.error.EmptyRelatedObjectValue,
      { parent: name },
      { attr: attr?.label ?? getEmbeddedLabel(context.name) }
    )
  }
  return val
}

async function getFunctionValue (
  control: ProcessControl,
  execution: Execution,
  context: SelectedContextFunc
): Promise<any> {
  const func = control.client.getModel().findObject(context.func)
  if (func === undefined) throw processError(process.error.MethodNotFound, { methodId: context.func }, {}, true)
  const impl = control.client.getHierarchy().as(func, serverProcess.mixin.FuncImpl)
  if (impl === undefined) throw processError(process.error.MethodNotFound, { methodId: context.func }, {}, true)
  const f = await getResource(impl.func)
  const res = await f(null, context.props, control, execution)
  if (context.sourceFunction !== undefined) {
    const transform = control.client.getModel().findObject(context.sourceFunction.func)
    if (transform === undefined) {
      throw processError(process.error.MethodNotFound, { methodId: context.sourceFunction.func }, {}, true)
    }
    if (!control.client.getHierarchy().hasMixin(transform, serverProcess.mixin.FuncImpl)) {
      throw processError(process.error.MethodNotFound, { methodId: context.sourceFunction.func }, {}, true)
    }
    const funcImpl = control.client.getHierarchy().as(transform, serverProcess.mixin.FuncImpl)
    const f = await getResource(funcImpl.func)
    const val = await f(res, {}, control, execution)
    if (val == null) {
      throw processError(process.error.EmptyFunctionResult, {}, { func: func.label })
    }
    return val
  }
  if (res == null) {
    throw processError(process.error.EmptyFunctionResult, {}, { func: func.label })
  }
  return res
}

function getUserRequestValue (control: ProcessControl, execution: Execution, context: SelectedUserRequest): any {
  const userContext = execution.context[context.id]
  if (userContext !== undefined) return userContext
  const attr = control.client.getHierarchy().findAttribute(context._class, context.key)
  throw processError(
    process.error.UserRequestedValueNotProvided,
    {},
    { attr: attr?.label ?? getEmbeddedLabel(context.key) }
  )
}

async function getExecutionContextValue (
  control: ProcessControl,
  execution: Execution,
  context: SelectedExecutionContext
): Promise<any> {
  const userContext = execution.context[context.id]
  const _process = control.client.getModel().findObject(execution.process)
  const processContext = _process?.context?.[context.id]
  if (userContext !== undefined) {
    if (context.key === '' || context.key === '_id') return userContext
    if (processContext !== undefined) {
      const contextVal =
        control.cache.get(userContext) ?? (await control.client.findOne(processContext?._class, { _id: userContext }))
      if (contextVal !== undefined) {
        const val = getValue(control, execution, context.key, contextVal)
        return val
      }
    }
  }
  throw processError(process.error.ContextValueNotProvided, { name: processContext?.name ?? context.id })
}
