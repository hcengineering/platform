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
//

import core, {
  type Association,
  type ApplyOperations,
  type Class,
  type Doc,
  type DocumentQuery,
  type Ref
} from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import { type Filter } from '@hcengineering/view'

import { filtersToQuery } from './filter'

/**
 * A relation selected before its owning document exists, buffered by the caller and written out
 * by {@link commitPendingRelations} once the document is created.
 *
 * @public
 */
export interface PendingRelation {
  association: Ref<Association>
  /** Side of the association the *picked* document sits on. */
  direction: 'A' | 'B'
  doc: Ref<Doc>
}

/**
 * The class of documents eligible for one side of an association.
 *
 * @public
 */
export function getRelationCandidatesClass (association: Association, direction: 'A' | 'B'): Ref<Class<Doc>> {
  return direction === 'B' ? association.classB : association.classA
}

/**
 * Builds the query of documents eligible for one side of an association: the side's class narrowed
 * by the association's `filterA`/`filterB` and, for versionable classes, the latest version only.
 *
 * @public
 */
export async function buildRelationCandidatesQuery (
  association: Association,
  direction: 'A' | 'B',
  excluded: Array<Ref<Doc>> = []
): Promise<DocumentQuery<Doc>> {
  const hierarchy = getClient().getHierarchy()
  const _class = getRelationCandidatesClass(association, direction)
  const isVersionable = hierarchy.classHierarchyMixin(_class, core.mixin.VersionableClass) !== undefined

  let query: DocumentQuery<Doc> = excluded.length > 0 ? { _id: { $nin: excluded } } : {}
  if (isVersionable) {
    query = { isLatest: true, ...query }
  }

  const filter = direction === 'B' ? association.filterB : association.filterA
  if (filter != null && filter !== '') {
    let parsed: Filter[] | undefined
    try {
      parsed = JSON.parse(filter) as Filter[]
    } catch (e) {
      console.error('Failed to parse relation filter', e)
    }
    if (parsed !== undefined) {
      // Individual stale filters are skipped inside `filtersToQuery`; the rest still narrow the query.
      query = await filtersToQuery(parsed, query)
    }
  }

  return query
}

/**
 * Writes buffered relations for a freshly created document into the given operations batch, so the
 * relations are committed in the same transaction as the document itself.
 *
 * @public
 */
export async function commitPendingRelations (
  ops: ApplyOperations,
  docId: Ref<Doc>,
  relations: PendingRelation[]
): Promise<void> {
  for (const rel of relations) {
    await ops.createDoc(core.class.Relation, core.space.Workspace, {
      association: rel.association,
      docA: rel.direction === 'B' ? docId : rel.doc,
      docB: rel.direction === 'B' ? rel.doc : docId
    })
  }
}
