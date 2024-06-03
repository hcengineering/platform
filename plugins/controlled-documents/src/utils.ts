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

import attachment from '@hcengineering/attachment'
import {
  ApplyOperations,
  Class,
  Data,
  Doc,
  DocumentUpdate,
  Ref,
  SortingOrder,
  Space,
  TxOperations,
  generateId
} from '@hcengineering/core'
import { LexoDecimal, LexoNumeralSystem36, LexoRank } from 'lexorank'
import LexoRankBucket from 'lexorank/lib/lexoRank/lexoRankBucket'

import documents from './plugin'

import {
  AttachmentsDocumentSection,
  ChangeControl,
  CollaborativeDocumentSection,
  ControlledDocument,
  Document,
  DocumentSection,
  DocumentSnapshot,
  DocumentSpace,
  DocumentState,
  DocumentTemplate,
  DocumentTemplateSection,
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
export async function createDocSections (
  client: TxOperations,
  documentId: Ref<Document> | Ref<DocumentSnapshot>,
  srcDocId: Ref<DocumentTemplate> | Ref<Document>,
  space: Ref<DocumentSpace>,
  attachedToClass: Ref<Class<Doc>> = documents.class.Document
): Promise<void> {
  const docSections = await client.findAll<DocumentSection>(documents.class.DocumentSection, {
    attachedTo: srcDocId
  })

  const hierarchy = client.getHierarchy()
  for (const section of docSections) {
    const sectionId: Ref<CollaborativeDocumentSection> = generateId()

    // copying templateSectionId if srcDoc is another doc or _id - if srcDoc is template
    const templateSectionId = section.templateSectionId ?? section._id

    // NOTE: ideally we should not assume section type here and allow for any types of sections
    // to be correctly created here. Add a mixin to section class with a function and invoke it here for
    // custom attributes/logic?
    if (hierarchy.isDerived(section._class, documents.class.CollaborativeDocumentSection)) {
      const collaborativeSection: CollaborativeDocumentSection = hierarchy.as(
        section,
        documents.class.CollaborativeDocumentSection
      )
      await client.addCollection<Document | DocumentSnapshot, CollaborativeDocumentSection>(
        documents.class.CollaborativeDocumentSection,
        space,
        documentId,
        attachedToClass,
        'sections',
        {
          title: collaborativeSection.title,
          rank: collaborativeSection.rank,
          key: collaborativeSection.key,
          collaboratorSectionId: collaborativeSection.collaboratorSectionId,
          attachments: collaborativeSection.attachments,
          templateSectionId
        },
        sectionId
      )
    } else if (hierarchy.isDerived(section._class, documents.class.AttachmentsDocumentSection)) {
      const attachmentsSection: AttachmentsDocumentSection = hierarchy.as(
        section,
        documents.class.AttachmentsDocumentSection
      )
      await client.addCollection<Document | DocumentSnapshot, AttachmentsDocumentSection>(
        documents.class.AttachmentsDocumentSection,
        space,
        documentId,
        attachedToClass,
        'sections',
        {
          title: attachmentsSection.title,
          rank: attachmentsSection.rank,
          key: attachmentsSection.key,
          attachments: attachmentsSection.attachments,
          templateSectionId
        },
        sectionId
      )

      // Copying attachments metadata, not the files. It should only be detached on remove rather than deleted.
      const attachmentsMeta = await client.findAll(attachment.class.Attachment, {
        attachedTo: section._id
      })

      await Promise.all(
        attachmentsMeta.map((a) =>
          client.addCollection(a._class, a.space, sectionId, section._class, 'attachments', {
            name: a.name,
            file: a.file,
            type: a.type,
            size: a.size,
            lastModified: a.lastModified
          })
        )
      )
    } else {
      await client.addCollection<Document | DocumentSnapshot, DocumentSection>(
        documents.class.DocumentSection,
        space,
        documentId,
        attachedToClass,
        'sections',
        {
          title: section.title,
          rank: section.rank,
          key: section.key,
          templateSectionId
        },
        sectionId
      )
    }
  }
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
export type DraftDocumentTemplateSection = DocumentTemplateSection & {
  draftId?: string
}

/**
 * @public
 */
export function getDraftDocumentTemplateSectionId (
  draftId: string | undefined,
  sectionId: string
): Ref<DocumentSection> {
  return `${sectionId}-${draftId ?? ''}` as Ref<DocumentSection>
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
export type DocumentTemplateSectionData<T extends DocumentTemplateSection = DocumentTemplateSection> = Pick<
Data<DocumentTemplateSection>,
'title' | 'description' | 'mandatory'
> & {
  id: Ref<DocumentTemplateSection>
  class: Ref<Class<T>>
  additional?: Omit<T, keyof DocumentTemplateSection>
}

/**
 * @public
 */
export async function appendTemplateSection<T extends DocumentTemplateSection> (
  client: TxOperations,
  docId: Ref<Document>,
  data: DocumentTemplateSectionData<T>,
  space: Ref<Space>
): Promise<void> {
  const lastOne = await client.findOne<DocumentTemplateSection>(
    documents.mixin.DocumentTemplateSection,
    { attachedTo: docId, attachedToClass: documents.class.Document },
    { sort: { rank: SortingOrder.Descending } }
  )

  const ops = client.apply(docId)
  const sectionId = (data.id + '-' + generateId()) as Ref<DocumentTemplateSection>

  await ops.addCollection(
    data.class,
    space,
    docId,
    documents.mixin.DocumentTemplate,
    'sections',
    {
      title: data.title,
      rank: calcRank(lastOne, undefined),
      key: docId,
      ...(data.additional ?? {})
    },
    sectionId
  )

  await ops.updateMixin<DocumentSection, DocumentTemplateSection>(
    sectionId,
    data.class,
    space,
    documents.mixin.DocumentTemplateSection,
    {
      description: data.description,
      guidance: '',
      mandatory: data.mandatory
    }
  )

  await ops.commit()
}

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
      documents: meta.documents
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
export const DEFAULT_SECTION_TITLE = 'Untitled'

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
