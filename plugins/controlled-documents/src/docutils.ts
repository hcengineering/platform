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
import { type AttachedData, type Class, type Ref, type TxOperations, Blob, Mixin } from '@hcengineering/core'
import {
  type ControlledDocument,
  type Document,
  type DocumentCategory,
  type DocumentMeta,
  type DocumentSpace,
  type DocumentTemplate,
  type HierarchyDocument,
  type Project,
  type ProjectDocument,
  DocumentState
} from './types'

import documents from './plugin'
import { TEMPLATE_PREFIX } from './utils'

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

  const { seqNumber, prefix, content, category } = await useDocumentTemplate(client, templateId)
  const { success, documentMetaId } = await createControlledDocMetadata(
    client,
    templateId,
    documentId,
    { ...spec, category },
    space,
    project,
    parent,
    prefix,
    seqNumber
  )

  if (!success) {
    return { seqNumber: -1, success: false }
  }

  await client.addCollection(
    docClass,
    space,
    documentMetaId,
    documents.class.DocumentMeta,
    'documents',
    {
      ...spec,
      template: templateId,
      seqNumber,
      prefix,
      state: DocumentState.Draft,
      content: spec.content ?? content
    },
    documentId
  )

  return { seqNumber, success: true }
}

export async function useDocumentTemplate (
  client: TxOperations,
  templateId: Ref<DocumentTemplate>
): Promise<{ seqNumber: number, prefix: string, content: Ref<Blob> | null, category?: Ref<DocumentCategory> }> {
  const template = await client.findOne(documents.mixin.DocumentTemplate, {
    _id: templateId
  })

  if (template === undefined) {
    return { seqNumber: -1, prefix: '', content: null }
  }

  await client.updateMixin(templateId, documents.class.Document, template.space, documents.mixin.DocumentTemplate, {
    $inc: { sequence: 1 }
  })

  // FIXME: not concurrency safe
  const seqNumber = template.sequence + 1
  const prefix = template.docPrefix

  return { seqNumber, prefix, content: template.content, category: template.category }
}

export async function createControlledDocMetadata (
  client: TxOperations,
  templateId: Ref<DocumentTemplate>,
  documentId: Ref<ControlledDocument>,
  spec: Omit<AttachedData<ControlledDocument>, 'content'>,
  space: Ref<DocumentSpace>,
  project: Ref<Project> | undefined,
  parent: Ref<ProjectDocument> | undefined,
  prefix: string,
  seqNumber: number
): Promise<{ success: boolean, seqNumber: number, documentMetaId: Ref<DocumentMeta>, projectDocumentId: Ref<ProjectDocument> }> {
  const projectId = project ?? documents.ids.NoProject

  const ops = client.apply()

  ops.notMatch(documents.class.Document, {
    template: templateId,
    seqNumber
  })

  ops.notMatch(documents.class.Document, {
    code: spec.code
  })

  const documentMetaId = await ops.createDoc(documents.class.DocumentMeta, space, {
    documents: 0,
    title: `${prefix}-${seqNumber} ${spec.title}`
  })

  let path: Array<Ref<DocumentMeta>> = []
  if (parent !== undefined) {
    path = await getParentPath(client, parent)
  }

  const projectMetaId = await ops.createDoc(documents.class.ProjectMeta, space, {
    project: projectId,
    meta: documentMetaId,
    path,
    parent: path[0] ?? documents.ids.NoParent,
    documents: 0
  })

  const projectDocumentId = await client.addCollection(
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

  const success = await ops.commit()

  return { success: success.result, seqNumber, documentMetaId, projectDocumentId }
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
  spec: Omit<AttachedData<ControlledDocument>, 'prefix'>,
  category: Ref<DocumentCategory>,
  author?: Ref<Employee>
): Promise<{ seqNumber: number, success: boolean }> {
  const { success, seqNumber, code, documentMetaId } = await createDocumentTemplateMetadata(client, _class, space, _mixin, project, parent, templateId, prefix, spec)

  if (!success) {
    return { seqNumber: -1, success: false }
  }

  await client.addCollection<DocumentMeta, HierarchyDocument>(
    _class,
    space,
    documentMetaId,
    documents.class.DocumentMeta,
    'documents',
    {
      ...spec,
      code,
      seqNumber,
      category,
      prefix: TEMPLATE_PREFIX,
      author,
      owner: author,
      content: spec.content ?? null
    },
    templateId
  )

  return { seqNumber, success: true }
}

export async function createDocumentTemplateMetadata (
  client: TxOperations,
  _class: Ref<Class<Document>>,
  space: Ref<DocumentSpace>,
  _mixin: Ref<Mixin<DocumentTemplate>>,
  project: Ref<Project> | undefined,
  parent: Ref<ProjectDocument> | undefined,
  templateId: Ref<ControlledDocument>,
  prefix: string,
  spec: Omit<AttachedData<ControlledDocument>, 'prefix' | 'content'>
): Promise<{ success: boolean, seqNumber: number, code: string, documentMetaId: Ref<DocumentMeta>, projectDocumentId: Ref<ProjectDocument> }> {
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
  const code = spec.code === '' ? `${TEMPLATE_PREFIX}-${seqNumber}` : spec.code

  let path: Array<Ref<DocumentMeta>> = []

  if (parent !== undefined) {
    path = await getParentPath(client, parent)
  }

  const ops = client.apply()

  ops.notMatch(documents.class.Document, {
    template: { $exists: false },
    seqNumber
  })

  ops.notMatch(documents.class.Document, {
    code
  })

  ops.notMatch(documents.mixin.DocumentTemplate, {
    docPrefix: prefix
  })

  const documentMetaId = await ops.createDoc(documents.class.DocumentMeta, space, {
    documents: 0,
    title: `${TEMPLATE_PREFIX}-${seqNumber} ${spec.title}`
  })

  const projectMetaId = await ops.createDoc(documents.class.ProjectMeta, space, {
    project: projectId,
    meta: documentMetaId,
    path,
    parent: path[0] ?? documents.ids.NoParent,
    documents: 0
  })

  const projectDocumentId = await client.addCollection(
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

  await ops.createMixin(templateId, documents.class.Document, space, _mixin, {
    sequence: 0,
    docPrefix: prefix
  })

  const success = await ops.commit()

  return { success: success.result, seqNumber, code, documentMetaId, projectDocumentId }
}
