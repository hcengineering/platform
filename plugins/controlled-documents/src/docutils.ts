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
import { type AttachedData, type Class, type Ref, type TxOperations, ApplyOperations, Blob, Mixin } from '@hcengineering/core'
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

  const ops = client.apply()

  const { seqNumber, prefix, content, category } = await useDocumentTemplate(ops, templateId, spec)

  let path: Array<Ref<DocumentMeta>> = []
  if (parent !== undefined) {
    path = await getParentPath(ops, parent)
  }

  const { metaId } = await createControlledDocMetadata(
    ops,
    templateId,
    documentId,
    { ...spec, category },
    space,
    project,
    prefix,
    seqNumber,
    path
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
      content
    },
    documentId
  )

  const success = await ops.commit()

  return { seqNumber, success: success.result }
}

export async function useDocumentTemplate (
  ops: ApplyOperations,
  templateId: Ref<DocumentTemplate>,
  spec: AttachedData<ControlledDocument>
): Promise<{ seqNumber: number, prefix: string, content: Ref<Blob> | null, category?: Ref<DocumentCategory> }> {
  const template = await ops.findOne(documents.mixin.DocumentTemplate, {
    _id: templateId
  })

  if (template === undefined) {
    return { seqNumber: -1, prefix: '', content: null }
  }

  await ops.updateMixin(templateId, documents.class.Document, template.space, documents.mixin.DocumentTemplate, {
    $inc: { sequence: 1 }
  })

  // FIXME: not concurrency safe
  const seqNumber = template.sequence + 1
  const prefix = template.docPrefix

  return { seqNumber, prefix, content: spec.content ?? template.content, category: template.category }
}

export async function createControlledDocMetadata (
  ops: ApplyOperations,
  templateId: Ref<DocumentTemplate>,
  documentId: Ref<ControlledDocument>,
  spec: AttachedData<ControlledDocument>,
  space: Ref<DocumentSpace>,
  project: Ref<Project> | undefined,
  prefix: string,
  seqNumber: number,
  path: Ref<DocumentMeta>[] = []
): Promise<{ seqNumber: number, metaId: Ref<DocumentMeta>, projectDocumentId: Ref<ProjectDocument> }> {
  const projectId = project ?? documents.ids.NoProject

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

  const projectDocumentId = await ops.addCollection(
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

  return { seqNumber, metaId, projectDocumentId }
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
  const ops = client.apply()

  const { seqNumber, code, metaId } = await createDocumentTemplateMetadata(ops, _class, space, _mixin, project, parent, templateId, prefix, spec)

  await ops.addCollection<DocumentMeta, HierarchyDocument>(
    _class,
    space,
    metaId,
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

  const success = await ops.commit()

  return { seqNumber, success: success.result }
}

export async function createDocumentTemplateMetadata (
  ops: ApplyOperations,
  _class: Ref<Class<Document>>,
  space: Ref<DocumentSpace>,
  _mixin: Ref<Mixin<DocumentTemplate>>,
  project: Ref<Project> | undefined,
  parent: Ref<ProjectDocument> | undefined,
  templateId: Ref<ControlledDocument>,
  prefix: string,
  spec: Omit<AttachedData<ControlledDocument>, 'prefix'>
): Promise<{ seqNumber: number, code: string, metaId: Ref<DocumentMeta>, projectDocumentId: Ref<ProjectDocument> }> {
  const projectId = project ?? documents.ids.NoProject

  const incResult = await ops.updateDoc(
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
    path = await getParentPath(ops, parent)
  }

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

  const projectDocumentId = await ops.addCollection(
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

  return { seqNumber, code, metaId, projectDocumentId }
}
