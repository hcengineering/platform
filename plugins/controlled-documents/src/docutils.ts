//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { type Employee } from '@hcengineering/contact'
import {
  type AttachedData,
  type Class,
  type CollaborativeDoc,
  type Doc,
  type Ref,
  type TxOperations,
  Mixin,
  generateId,
  makeCollaborativeDoc
} from '@hcengineering/core'
import {
  type Document,
  type DocumentTemplate,
  type CollaborativeDocumentSection,
  type ControlledDocument,
  type DocumentCategory,
  type DocumentSpace,
  type DocumentMeta,
  type Project,
  DocumentState,
  HierarchyDocument,
  ProjectDocument
} from './types'

import documents from './plugin'
import { TEMPLATE_PREFIX, calcRank, createDocSections } from './utils'

async function getParentPath (client: TxOperations, parent: Ref<ProjectDocument>): Promise<Array<Ref<DocumentMeta>>> {
  const parentDocObj = await client.findOne(documents.class.ProjectDocument, {
    _id: parent
  })

  if (parentDocObj === undefined) {
    console.warn(`Couldn't find the parent project document object with id: ${parent}`)
    return []
  }

  const parentMeta = await client.findOne(documents.class.ProjectMeta, {
    _id: parentDocObj.attachedTo
  })

  if (parentMeta === undefined) {
    console.warn(`Couldn't find the parent document meta with id: ${parentDocObj.attachedTo}`)
    return []
  }

  return [parentMeta.meta, ...parentMeta.path]
}

export async function createControlledDocFromTemplate (
  client: TxOperations,
  templateId: Ref<DocumentTemplate> | undefined,
  documentId: Ref<ControlledDocument>,
  spec: AttachedData<ControlledDocument>,
  space: Ref<DocumentSpace>,
  project: Ref<Project> | undefined,
  parent: Ref<ProjectDocument> | undefined,
  docClass: Ref<Class<ControlledDocument>> = documents.class.ControlledDocument
): Promise<{ seqNumber: number, success: boolean }> {
  if (templateId == null) {
    return { seqNumber: -1, success: false }
  }

  const template = await client.findOne(
    documents.mixin.DocumentTemplate,
    {
      _id: templateId
    },
    {
      lookup: {
        _id: { sections: documents.class.DocumentSection }
      }
    }
  )

  if (template === undefined) {
    return { seqNumber: -1, success: false }
  }

  let path: Array<Ref<DocumentMeta>> = []

  if (parent !== undefined) {
    path = await getParentPath(client, parent)
  }

  await client.updateMixin(templateId, documents.class.Document, template.space, documents.mixin.DocumentTemplate, {
    $inc: { sequence: 1 }
  })

  // FIXME: not concurrency safe
  const seqNumber = template.sequence + 1
  const prefix = template.docPrefix

  return await createControlledDoc(
    client,
    templateId,
    documentId,
    { ...spec, category: template.category },
    space,
    project,
    prefix,
    seqNumber,
    path,
    docClass
  )
}

async function createControlledDoc (
  client: TxOperations,
  templateId: Ref<DocumentTemplate>,
  documentId: Ref<ControlledDocument>,
  spec: AttachedData<ControlledDocument>,
  space: Ref<DocumentSpace>,
  project: Ref<Project> | undefined,
  prefix: string,
  seqNumber: number,
  path: Ref<DocumentMeta>[] = [],
  docClass: Ref<Class<ControlledDocument>> = documents.class.ControlledDocument
): Promise<{ seqNumber: number, success: boolean }> {
  const projectId = project ?? documents.ids.NoProject

  const collaborativeDoc = getCollaborativeDocForDocument(`DOC-${prefix}`, seqNumber, 0, 1)

  const ops = client.apply(documentId)

  ops.notMatch(documents.class.Document, {
    template: templateId,
    seqNumber
  })

  ops.notMatch(documents.class.Document, {
    code: spec.code
  })

  const metaId = await ops.createDoc(documents.class.DocumentMeta, space, {
    documents: 0,
    title: `${prefix}-${seqNumber} ${spec.title}`
  })

  const projectMetaId = await ops.createDoc(documents.class.ProjectMeta, space, {
    project: projectId,
    meta: metaId,
    path,
    parent: path[0] ?? documents.ids.NoParent,
    documents: 0
  })

  await client.addCollection(
    documents.class.ProjectDocument,
    space,
    projectMetaId,
    documents.class.ProjectMeta,
    'documents',
    {
      project: projectId,
      initial: projectId,
      document: documentId
    }
  )

  await ops.addCollection(
    docClass,
    space,
    metaId,
    documents.class.DocumentMeta,
    'documents',
    {
      ...spec,
      template: templateId,
      seqNumber,
      prefix,
      state: DocumentState.Draft,
      content: collaborativeDoc
    },
    documentId
  )

  await createDocSections(ops, documentId, templateId, space, documents.class.ControlledDocument)

  const success = await ops.commit()

  return { seqNumber, success }
}

export async function createDocumentTemplate (
  client: TxOperations,
  _class: Ref<Class<Document>>,
  space: Ref<DocumentSpace>,
  _mixin: Ref<Mixin<DocumentTemplate>>,
  project: Ref<Project> | undefined,
  parent: Ref<ProjectDocument> | undefined,
  templateId: Ref<ControlledDocument>,
  prefix: string,
  spec: AttachedData<ControlledDocument>,
  category: Ref<DocumentCategory>,
  author?: Ref<Employee>,
  defaultSection?: { title: string }
): Promise<{ seqNumber: number, success: boolean }> {
  const projectId = project ?? documents.ids.NoProject

  const incResult = await client.updateDoc(
    documents.class.Sequence,
    documents.space.Documents,
    documents.sequence.Templates,
    {
      $inc: { sequence: 1 }
    },
    true
  )
  const seqNumber = (incResult as any).object.sequence as number
  const collaborativeDocId = getCollaborativeDocForDocument('TPL-DOC', seqNumber, 0, 1)

  let path: Array<Ref<DocumentMeta>> = []

  if (parent !== undefined) {
    path = await getParentPath(client, parent)
  }

  const ops = client.apply(templateId)

  ops.notMatch(documents.class.Document, {
    template: { $exists: false },
    seqNumber
  })

  ops.notMatch(documents.class.Document, {
    code: spec.code
  })

  ops.notMatch(documents.mixin.DocumentTemplate, {
    docPrefix: prefix
  })

  const metaId = await ops.createDoc(documents.class.DocumentMeta, space, {
    documents: 0,
    title: `${TEMPLATE_PREFIX}-${seqNumber} ${spec.title}`
  })

  const projectMetaId = await ops.createDoc(documents.class.ProjectMeta, space, {
    project: projectId,
    meta: metaId,
    path,
    parent: path[0] ?? documents.ids.NoParent,
    documents: 0
  })

  await client.addCollection(
    documents.class.ProjectDocument,
    space,
    projectMetaId,
    documents.class.ProjectMeta,
    'documents',
    {
      project: projectId,
      initial: projectId,
      document: templateId
    }
  )

  await ops.addCollection<DocumentMeta, HierarchyDocument>(
    _class,
    space,
    metaId,
    documents.class.DocumentMeta,
    'documents',
    {
      ...spec,
      seqNumber,
      category,
      prefix: TEMPLATE_PREFIX,
      author,
      owner: author,
      content: collaborativeDocId
    },
    templateId
  )

  await ops.createMixin(templateId, documents.class.Document, space, _mixin, {
    sequence: 0,
    docPrefix: prefix
  })

  if (defaultSection != null) {
    // adding the default first section
    const sectionId = generateId()
    const collaboratorSectionId = generateId()

    await ops.addCollection(
      documents.class.CollaborativeDocumentSection,
      space,
      templateId,
      documents.mixin.DocumentTemplate,
      'sections',
      {
        title: defaultSection.title,
        rank: calcRank(),
        key: sectionId,
        collaboratorSectionId,
        attachments: 0
      },
      sectionId as Ref<CollaborativeDocumentSection>
    )

    await ops.updateMixin(
      sectionId,
      documents.class.CollaborativeDocumentSection,
      space,
      documents.mixin.DocumentTemplateSection,
      { description: '', guidance: '' }
    )
  }

  const success = await ops.commit()

  return { seqNumber, success }
}

export function getCollaborativeDocForDocument (
  prefix: string,
  seqNumber: number,
  major: number,
  minor: number,
  next: boolean = false
): CollaborativeDoc {
  if (prefix.endsWith('-')) {
    prefix = prefix.substring(0, prefix.length - 1)
  }

  return makeCollaborativeDoc(
    (`${prefix}-${seqNumber}-${major}.${minor}${next ? '.next' : ''}-` + generateId()) as Ref<Doc>
  )
}
