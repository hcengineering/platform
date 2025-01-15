//
// Copyright © 2022-2023 Hardcore Engineering Inc.
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
import {
  ApplyOperations,
  Data,
  DocumentQuery,
  DocumentUpdate,
  Rank,
  Ref,
  SortingOrder,
  Space,
  TxOperations
} from '@hcengineering/core'
import { LexoDecimal, LexoNumeralSystem36, LexoRank } from 'lexorank'
import LexoRankBucket from 'lexorank/lib/lexoRank/lexoRankBucket'

import documents from './plugin'

import {
  ChangeControl,
  ControlledDocument,
  Document,
  DocumentMeta,
  DocumentSpace,
  DocumentState,
  Project,
  ProjectDocument,
  ProjectMeta
} from './types'

/**
 * @public
 */
export const genRanks = (count: number): Generator<string, void, unknown> =>
  (function * () {
    const sys = new LexoNumeralSystem36()
    const base = 36
    const max = base ** 6
    const gap = LexoDecimal.parse(Math.trunc(max / (count + 2)).toString(base), sys)
    let cur = LexoDecimal.parse('0', sys)

    for (let i = 0; i < count; i++) {
      cur = cur.add(gap)
      yield new LexoRank(LexoRankBucket.BUCKET_0, cur).toString()
    }
  })()

/**
 * @public
 */
export const calcRank = (prev?: { rank: string }, next?: { rank: string }): string => {
  const a = prev?.rank !== undefined ? LexoRank.parse(prev.rank) : LexoRank.min()
  const b = next?.rank !== undefined ? LexoRank.parse(next.rank) : LexoRank.max()

  return a.between(b).toString()
}

/**
 * @public
 */
export async function createChangeControl (
  client: TxOperations,
  ccId: Ref<ChangeControl>,
  ccSpec: Data<ChangeControl>,
  space: Ref<DocumentSpace>
): Promise<void> {
  await client.createDoc(documents.class.ChangeControl, space, ccSpec, ccId)
}

/**
 * @public
 */
export function getDocumentId (document: Pick<Document, 'prefix' | 'seqNumber'>): string {
  return `${document.prefix}-${document.seqNumber}`
}

/** @public */
const documentIdRegExp = /^(?<prefix>\w+)-(?<seqNumber>\d+)$/

/** @public */
export function matchDocumentId (str: string): Pick<Document, 'prefix' | 'seqNumber'> | null {
  const match = str.match(documentIdRegExp)
  if (match?.groups?.prefix === undefined || match.groups.seqNumber === undefined) {
    return null
  }
  return {
    prefix: match.groups.prefix,
    seqNumber: parseFloat(match.groups.seqNumber)
  }
}

/**
 * @public
 */
export function isControlledDocument (client: TxOperations, doc: Document): doc is ControlledDocument {
  return client.getHierarchy().isDerived(doc._class, documents.class.ControlledDocument)
}

/**
 * @public
 */
export type EditorMode = 'viewing' | 'editing' | 'comparing'

/**
 * @public
 */
export async function deleteProjectDrafts (client: ApplyOperations, source: Ref<Project>): Promise<void> {
  const projectDocs = await client.findAll(documents.class.ProjectDocument, { project: source })

  const toDelete = await client.findAll(documents.class.Document, {
    _id: { $in: projectDocs.map((p) => p.document) },
    state: DocumentState.Draft
  })

  for (const doc of toDelete) {
    await client.update(doc, { state: DocumentState.Deleted })
  }
}

/**
 * @public
 */
export async function copyProjectDocuments (
  client: ApplyOperations,
  source: Ref<Project>,
  target: Ref<Project>
): Promise<void> {
  const projectMeta = await client.findAll(documents.class.ProjectMeta, { project: source })
  const projectDocs = await client.findAll(documents.class.ProjectDocument, { project: source })

  const projectDocsByMeta = new Map<Ref<ProjectMeta>, ProjectDocument[]>()
  for (const doc of projectDocs) {
    const docs = projectDocsByMeta.get(doc.attachedTo) ?? []
    docs.push(doc)
    projectDocsByMeta.set(doc.attachedTo, docs)
  }

  for (const meta of projectMeta) {
    // copy meta
    const projectMetaId = await client.createDoc(documents.class.ProjectMeta, meta.space, {
      project: target,
      meta: meta.meta,
      path: meta.path,
      parent: meta.parent,
      documents: meta.documents,
      rank: meta.rank
    })

    // copy project docs attached to meta
    const projectDocs = projectDocsByMeta.get(meta._id) ?? []
    for (const doc of projectDocs) {
      await client.addCollection(
        documents.class.ProjectDocument,
        meta.space,
        projectMetaId,
        documents.class.ProjectMeta,
        'documents',
        {
          project: target,
          initial: doc.initial,
          document: doc.document
        }
      )
    }
  }
}

/**
 * @public
 */
export async function getFirstRank (
  client: TxOperations,
  space: Ref<Space>,
  project: Ref<Project>,
  parent: Ref<DocumentMeta>,
  sort: SortingOrder = SortingOrder.Descending,
  extra: DocumentQuery<ProjectMeta> = {}
): Promise<Rank | undefined> {
  const doc = await client.findOne(
    documents.class.ProjectMeta,
    { space, project, parent, ...extra },
    { sort: { rank: sort }, projection: { rank: 1 } }
  )

  return doc?.rank
}

/**
 * @public
 */
export function getEffectiveDocUpdate (): DocumentUpdate<ControlledDocument> {
  return {
    state: DocumentState.Effective,
    effectiveDate: Date.now(),
    controlledState: undefined
  }
}

/**
 * @public
 */
export function getDocumentName (doc: Document): string {
  return `${doc.code} ${doc.title}`
}

export const periodicReviewIntervals: readonly number[] = [6, 12, 18, 24, 30, 36]

/**
 * @public
 */
export const DEFAULT_PERIODIC_REVIEW_INTERVAL: Readonly<number> = periodicReviewIntervals[1]

/**
 * @public
 */
export const TEMPLATE_PREFIX = 'TMPL'
