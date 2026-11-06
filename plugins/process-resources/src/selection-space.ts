//
// Copyright © 2026 TraceX SAS.
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

import core, { checkMixinKey, getObjectValue } from '@hcengineering/core'
import type { AnyAttribute, Class, Client, Doc, DocumentQuery, Ref, RefTo, Space } from '@hcengineering/core'
import process, { parseContext, processError } from '@hcengineering/process'
import type {
  Context,
  ExecutionContext,
  Process,
  SelectedUserRequest,
  SelectionRelation,
  UserResult
} from '@hcengineering/process'

export interface ResolvedUserRequest extends Omit<SelectedUserRequest, 'selectionSpace'> {
  selectionSpace?: Ref<Space>
  docQuery?: DocumentQuery<Doc>
}

export interface ResolvedUserResult extends Omit<UserResult, 'selectionSpace'> {
  selectionSpace?: Ref<Space>
  docQuery?: DocumentQuery<Doc>
}

/** Lists scalar space sources available before the user supplies a result. */
export function getSelectionSpaceContext (client: Client, definition: Process): Context {
  const hierarchy = client.getHierarchy()
  const getAttributes = (_class: Ref<Class<Doc>>): AnyAttribute[] =>
    Array.from(hierarchy.getAllAttributes(_class).values()).filter(
      (attribute) =>
        (attribute.hidden !== true || attribute.name === 'space') &&
        attribute.type._class === core.class.RefTo &&
        hierarchy.isDerived((attribute.type as RefTo<Doc>).to, core.class.Space)
    )

  const result: Context = {
    attributes: getAttributes(definition.masterTag),
    executionContext: {},
    functions: [],
    nested: {},
    relations: {}
  }
  for (const context of Object.values(definition.context)) {
    if (context.type?._class === core.class.ArrOf) continue
    if (!hierarchy.isDerived(context._class, core.class.Doc)) continue
    const isSpace = hierarchy.isDerived(context._class, core.class.Space)
    const attributes = isSpace ? [] : getAttributes(context._class)
    if (isSpace || attributes.length > 0) {
      result.executionContext[context.value.id] = {
        name: context.name,
        context: context.value.id,
        value: context.value,
        attributes
      }
    }
  }
  return result
}

/** Resolves a configured space without dropping the restriction when its source is empty. */
export async function resolveSelectionSpace (
  client: Client,
  definition: Process,
  doc: Doc | undefined,
  executionContext: ExecutionContext,
  configured: string | null | undefined
): Promise<Ref<Space> | undefined> {
  if (configured == null) return undefined
  const source = parseContext(configured)
  if (source === undefined) return configured as Ref<Space>

  const readAttribute = (object: Doc, key: string, _class: Ref<Class<Doc>> = definition.masterTag): unknown => {
    const resolvedKey = definition.bindings?.[key] ?? key
    return getObjectValue(checkMixinKey(resolvedKey, _class, client.getHierarchy()), object)
  }

  let value: unknown
  if (source.type === 'const') {
    value = source.value
  } else if (source.type === 'attribute' && doc !== undefined) {
    value = readAttribute(doc, source.key)
  } else if (source.type === 'context') {
    const stored: unknown = executionContext[source.id]
    if (source.key === '' || source.key === '_id') {
      value = stored
    } else {
      const context = definition.context[source.id]
      const object =
        typeof stored === 'string' && context !== undefined
          ? await client.findOne(context._class, { _id: stored as Ref<Doc> })
          : stored
      if (typeof object === 'object' && object !== null && !Array.isArray(object)) {
        value = readAttribute(object as Doc, source.key, context?._class ?? (object as Doc)._class)
      }
    }
  }
  if (typeof value === 'object' && value !== null && '_id' in value) value = value._id
  if (typeof value !== 'string' || value === '' || parseContext(value) !== undefined) {
    const name = source.type === 'context' ? (definition.context[source.id]?.name ?? source.id) : source.key
    throw processError(process.error.ContextValueNotProvided, { name })
  }
  return value as Ref<Space>
}

/** Excludes targets already connected to the current process card, preserving the space restriction. */
export async function resolveSelectionQuery (
  client: Client,
  cardId: Ref<Doc> | undefined,
  selectionSpace: Ref<Space> | undefined,
  relation?: SelectionRelation,
  selectionClass?: Ref<Class<Doc>>,
  versions?: SelectionRelation['versions']
): Promise<DocumentQuery<Doc>> {
  const query: DocumentQuery<Doc> = selectionSpace !== undefined ? { space: selectionSpace } : {}
  const association = relation !== undefined ? client.getModel().getObject(relation.association) : undefined
  const targetClass =
    selectionClass ??
    (association !== undefined ? (relation?.direction === 'A' ? association.classA : association.classB) : undefined)
  const selectedVersions = versions ?? relation?.versions
  if (
    targetClass !== undefined &&
    (relation !== undefined || selectedVersions !== undefined) &&
    client.getHierarchy().classHierarchyMixin(targetClass, core.mixin.VersionableClass) !== undefined
  ) {
    // Explicitly include historical targets so versioning middleware preserves the selection query.
    query.isLatest = selectedVersions === 'latest' ? true : { $in: [true, false] }
    if (selectedVersions === 'effective') query.isEffective = true
  }
  if (relation === undefined) return query
  if (cardId === undefined) {
    throw processError(process.error.ContextValueNotProvided, { name: 'card' })
  }
  const relations = await client.findAll(core.class.Relation, {
    association: relation.association,
    ...(relation.direction === 'A' ? { docB: cardId } : { docA: cardId })
  })
  query._id = { $nin: [...new Set(relations.map((item) => (relation.direction === 'A' ? item.docA : item.docB)))] }
  return query
}
