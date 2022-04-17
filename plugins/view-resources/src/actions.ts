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

import type { Doc } from '@anticrm/core'
import core, { Class, Client, FindResult, matchQuery, Ref } from '@anticrm/core'
import type { Action, ActionTarget, ViewContext } from '@anticrm/view'
import view from './plugin'

/**
 * @public
 *
 * Find all action contributions applicable for specified _class.
 * If derivedFrom is specifie, only actions applicable to derivedFrom class will be used.
 * So if we have contribution for Doc, Space and we ask for SpaceWithStates and derivedFrom=Space,
 * we won't recieve Doc contribution but recieve Space ones.
 */
export async function getActions (
  client: Client,
  doc: Doc | Doc[],
  derived: Ref<Class<Doc>> = core.class.Doc,
  singleInput = false
): Promise<FindResult<Action>> {
  const targets = await client.findAll(view.class.ActionTarget, {
    'context.mode': 'context'
  })
  const tmap = new Map(targets.map(it => ([it.action, it.context?.group])))

  const categories: Record<string, number> = { top: 1, filter: 50, tools: 100 }

  let filter = targets.map(it => it.action)
  if (Array.isArray(doc)) {
    for (const d of doc) {
      const b = filterActions(client, d, targets, derived)
      filter = filter.filter(it => b.includes(it))
    }
  } else {
    filter = filterActions(client, doc, targets, derived)
  }
  const result = await client.findAll(view.class.Action, {
    _id: { $in: filter },
    singleInput: { $in: [undefined, singleInput] }
  })
  result.sort((a, b) => {
    const aTarget = categories[tmap.get(a._id) ?? 'top'] ?? 0
    const bTarget = categories[tmap.get(b._id) ?? 'top'] ?? 0
    return aTarget - bTarget
  })
  return result
}

export async function getContextActions (
  client: Client,
  target: Ref<Class<Doc>>,
  context: ViewContext,
  multiple: boolean
): Promise<FindResult<Action>> {
  const desc = client.getHierarchy().getAncestors(target)
  const targets = await client.findAll(view.class.ActionTarget, {
    target: { $in: desc },
    'context.mode': context.mode,
    'context.application': { $in: [context.application, undefined] }
  })
  return await client.findAll(view.class.Action, {
    _id: { $in: targets.map((it) => it.action) },
    singleInput: { $in: [undefined, !multiple] }
  })
}

function filterActions (
  client: Client,
  doc: Doc,
  targets: ActionTarget[],
  derived: Ref<Class<Doc>> = core.class.Doc
): Array<Ref<Action>> {
  const result: Array<Ref<Action>> = []
  const hierarchy = client.getHierarchy()
  const clazz = hierarchy.getClass(doc._class)
  const ignoreActions = hierarchy.as(clazz, view.mixin.IgnoreActions)
  const ignore = ignoreActions?.actions ?? []
  for (const target of targets) {
    if (ignore.includes(target.action)) {
      continue
    }
    if (target.query !== undefined) {
      const r = matchQuery([doc], target.query, doc._class, hierarchy)
      if (r.length === 0) {
        continue
      }
    }
    if (hierarchy.isDerived(doc._class, target.target) && client.getHierarchy().isDerived(target.target, derived)) {
      result.push(target.action)
    }
  }
  return result
}
