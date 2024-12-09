//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2022 Hardcore Engineering Inc.
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

import { Analytics } from '@hcengineering/analytics'
import core, {
  AccountRole,
  getCurrentAccount,
  hasAccountRole,
  matchQuery,
  type Class,
  type Client,
  type Doc,
  type Ref,
  type WithLookup
} from '@hcengineering/core'
import { getResource } from '@hcengineering/platform'
import { addRefreshListener, getClient } from '@hcengineering/presentation'
import { getEventPositionElement, showPopup } from '@hcengineering/ui'
import {
  type Action,
  type ActionGroup,
  type ActionIgnore,
  type ViewActionInput,
  type ViewContextType
} from '@hcengineering/view'
import Menu from './components/Menu.svelte'
import view from './plugin'
import { type FocusSelection, type SelectionStore } from './selection'
import { restrictionStore } from './utils'

/**
 * @public
 */
export function getSelection (focus: FocusSelection, selection: SelectionStore): Doc[] {
  let docs: Doc[] = []
  if (selection.docs.length > 0) {
    docs = selection.docs
  } else if (focus.focus !== undefined) {
    docs = [focus.focus]
  }
  return docs
}

const allActions = new Map<ViewContextType, Action[]>()

addRefreshListener(() => {
  allActions.clear()
})

/**
 * @public
 *
 * Find all action contributions applicable for specified _class.
 * If derivedFrom is specified, only actions applicable to derivedFrom class will be used.
 * So if we have contribution for Doc, Space and we ask for Project and derivedFrom=Space,
 * we won't receive Doc contribution but receive Space ones.
 */
export async function getActions (
  client: Client,
  doc: Doc | Doc[],
  derived: Ref<Class<Doc>> = core.class.Doc,
  mode: ViewContextType = 'context'
): Promise<Action[]> {
  let actions: Action[] | undefined = allActions.get(mode)
  if (actions === undefined) {
    actions = client.getModel().findAllSync(view.class.Action, { 'context.mode': mode })
    allActions.set(mode, actions)
  }

  const filteredActions = await filterAvailableActions(actions, client, doc, derived)

  const categories: Partial<Record<ActionGroup | 'top', number>> = { top: 1, tools: 50, other: 100, remove: 200 }
  filteredActions.sort((a, b) => {
    const aTarget = categories[a.context.group ?? 'top'] ?? 0
    const bTarget = categories[b.context.group ?? 'top'] ?? 0
    return aTarget - bTarget
  })
  return filteredActions
}

export async function filterAvailableActions (
  actions: Action[],
  client: Client,
  doc: Doc | Doc[],
  derived: Ref<Class<Doc>> = core.class.Doc
): Promise<Action[]> {
  actions = (Array.isArray(doc) ? doc : [doc]).reduce(
    (actions, doc) => filterActions(client, doc, actions, derived),
    actions
  )

  const input = (['none'] as ViewActionInput[])
    .concat(Array.isArray(doc) && doc.length > 0 ? ['selection', 'any'] : [])
    .concat(!Array.isArray(doc) || doc.length === 1 ? ['focus', 'any'] : [])
  actions = actions.filter((it) => input.includes(it.input))

  const result: Action[] = []
  for (const action of actions) {
    if (action.visibilityTester == null) {
      result.push(action)
    } else {
      const visibilityTester = await getResource(action.visibilityTester)

      if (await visibilityTester(doc)) {
        result.push(action)
      }
    }
  }

  return result
}

/** @public */
export async function invokeAction (
  object: Doc | Doc[],
  evt: Event,
  action: Action,
  props?: Record<string, any>
): Promise<void> {
  const impl = await getResource(action.action)
  Analytics.handleEvent(action.analyticsEvent ?? action._id)
  await impl(Array.isArray(object) && object.length === 1 ? object[0] : object, evt, {
    ...action.actionProps,
    ...props
  })
}

export async function getContextActions (
  client: Client,
  doc: Doc | Doc[],
  context: {
    mode: ViewContextType
    application?: Ref<Doc>
  },
  derived: Ref<Class<Doc>> = core.class.Doc
): Promise<Action[]> {
  const result = await getActions(client, doc, derived, context.mode)

  if (context.application !== undefined) {
    return result.filter((it) => it.context.application === context.application || it.context.application === undefined)
  }
  return result
}

function getKeyboardActionsSync (
  client: Client,
  doc: Doc | Doc[],
  derived: Ref<Class<Doc>> = core.class.Doc,
  mode: ViewContextType = 'context'
): Action[] {
  const actions: Action[] = client.getModel().findAllSync(view.class.Action, {
    'context.mode': mode,
    keyBinding: { $exists: true }
  })

  const filteredActions = filterAvailableActionsSync(actions, client, doc, derived)

  const categories: Partial<Record<ActionGroup | 'top', number>> = { top: 1, tools: 50, other: 100, remove: 200 }
  filteredActions.sort((a, b) => {
    const aTarget = categories[a.context.group ?? 'top'] ?? 0
    const bTarget = categories[b.context.group ?? 'top'] ?? 0
    return aTarget - bTarget
  })
  return filteredActions
}

function filterAvailableActionsSync (
  actions: Action[],
  client: Client,
  doc: Doc | Doc[],
  derived: Ref<Class<Doc>> = core.class.Doc
): Action[] {
  actions = (Array.isArray(doc) ? doc : [doc]).reduce(
    (actions, doc) => filterActions(client, doc, actions, derived),
    actions
  )

  const input = (['none'] as ViewActionInput[])
    .concat(Array.isArray(doc) && doc.length > 0 ? ['selection', 'any'] : [])
    .concat(!Array.isArray(doc) || doc.length === 1 ? ['focus', 'any'] : [])
  actions = actions.filter((it) => input.includes(it.input))

  const result: Action[] = []
  for (const action of actions) {
    if (action.visibilityTester == null) {
      result.push(action)
    }
  }

  return result
}

export function getContextActionsSync (
  client: Client,
  doc: Doc | Doc[],
  context: {
    mode: ViewContextType
    application?: Ref<Doc>
  }
): Action[] {
  const result = getKeyboardActionsSync(client, doc, undefined, context.mode)

  if (context.application !== undefined) {
    return result.filter((it) => it.context.application === context.application || it.context.application === undefined)
  }
  return result
}

function getIgnoreActions (ignoreActions: Array<Ref<Action> | ActionIgnore>, doc: Doc): Array<Ref<Action>> {
  const ignore: Array<Ref<Action>> = []
  const h = getClient().getHierarchy()
  for (const a of ignoreActions) {
    if (typeof a === 'string') {
      ignore.push(a)
    } else {
      if (matchQuery([doc], a.query, a._class, h).length === 1) {
        ignore.push(a.action)
      }
    }
  }
  return ignore
}

/**
 * @public
 */
export function filterActions (
  client: Client,
  doc: Doc,
  actions: Array<WithLookup<Action>>,
  derived: Ref<Class<Doc>> = core.class.Doc
): Array<WithLookup<Action>> {
  let result: Array<WithLookup<Action>> = []
  const hierarchy = client.getHierarchy()
  const me = getCurrentAccount()
  const clazz = hierarchy.getClass(doc._class)
  const ignoreActions = hierarchy.as(clazz, view.mixin.IgnoreActions)
  const ignore: Array<Ref<Action>> = getIgnoreActions(ignoreActions?.actions ?? [], doc)

  // Collect ignores from parent
  const ancestors = hierarchy.getAncestors(clazz._id)

  for (const cl of ancestors) {
    const ignoreActions = hierarchy.as(hierarchy.getClassOrInterface(cl), view.mixin.IgnoreActions)
    if (ignoreActions?.actions !== undefined) {
      ignore.push(...getIgnoreActions(ignoreActions.actions, doc))
    }
  }
  for (const cl of hierarchy.getDescendants(clazz._id)) {
    if (hierarchy.isMixin(cl) && hierarchy.hasMixin(doc, cl)) {
      const ignoreActions = hierarchy.as(hierarchy.getClassOrInterface(cl), view.mixin.IgnoreActions)
      if (ignoreActions?.actions !== undefined) {
        ignore.push(...getIgnoreActions(ignoreActions.actions, doc))
      }
    }
  }
  const overrideRemove: Array<Ref<Action>> = []
  for (const action of actions) {
    if (ignore.includes(action._id)) {
      continue
    }
    if (!hasAccountRole(me, AccountRole.Maintainer) && action.secured === true) {
      continue
    }
    if (
      (hierarchy.isDerived(doc._class, action.target) && client.getHierarchy().isDerived(action.target, derived)) ||
      (hierarchy.isMixin(action.target) && hierarchy.hasMixin(doc, action.target))
    ) {
      if (action.override !== undefined) {
        overrideRemove.push(...action.override)
      }
      if (action.query !== undefined) {
        if (hierarchy.isMixin(action.target)) {
          const r = matchQuery([hierarchy.as(doc, action.target)], action.query, action.target, hierarchy)
          if (r.length === 0) {
            continue
          }
        } else {
          const r = matchQuery([doc], action.query, doc._class, hierarchy)
          if (r.length === 0) {
            continue
          }
        }
      }
      result.push(action)
    }
  }
  if (overrideRemove.length > 0) {
    result = result.filter((it) => !overrideRemove.includes(it._id))
  }
  return result
}

let disableActions: boolean = false

restrictionStore.subscribe((v) => {
  disableActions = v.disableActions
})

export function showMenu (ev: MouseEvent, props: any, onClose?: (result: any) => void | Promise<void>): void {
  ev.stopPropagation()
  ev.preventDefault()
  if (disableActions) return
  showPopup(Menu, props, getEventPositionElement(ev), onClose)
}
