import attachment, { Attachment } from '@hcengineering/attachment'
import { getClient as getCollaboratorClient } from '@hcengineering/collaborator-client'
import documents, {
  ChangeControl,
  ControlledDocument,
  DEFAULT_PERIODIC_REVIEW_INTERVAL,
  Document,
  DocumentCategory,
  DocumentState,
  DocumentTemplate,
  createChangeControl,
  createControlledDocFromTemplate,
  createDocumentTemplate
} from '@hcengineering/controlled-documents'
import core, {
  AttachedData,
  BackupClient,
  Client as CoreClient,
  Data,
  MeasureContext,
  Ref,
  TxOperations,
  generateId,
  makeDocCollabId,
  systemAccountUuid,
  type Blob
} from '@hcengineering/core'
import { createClient, getTransactorEndpoint } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'
import { findAll, getOuterHTML } from 'domutils'
import { parseDocument } from 'htmlparser2'

import { Config } from './config'
import { ExtractedFile } from './extract/extract'
import { ExtractedSection } from './extract/sections'

export default async function importExtractedFile (
  ctx: MeasureContext,
  config: Config,
  extractedFile: ExtractedFile
): Promise<void> {
  const { workspaceId } = config
  const token = generateToken(systemAccountUuid, workspaceId)
  const transactorUrl = await getTransactorEndpoint(token, 'external')
  console.log(`Connecting to transactor: ${transactorUrl} (ws: '${workspaceId}')`)
  const connection = (await createClient(transactorUrl, token)) as CoreClient & BackupClient

  try {
    console.log(`Connected to ${transactorUrl}`)
    const txops = new TxOperations(connection, core.account.System)

    try {
      const docId = await createDocument(txops, extractedFile, config)
      const createdDoc = await txops.findOne(documents.class.Document, { _id: docId })
      if (createdDoc == null) {
        throw new Error(`Failed to obtain created document: ${docId}`)
      }

      await createSections(ctx, txops, extractedFile, config, createdDoc)
    } finally {
      await txops.close()
    }
  } finally {
    await connection.close()
  }
}

async function createDocument (
  txops: TxOperations,
  extractedFile: ExtractedFile,
  config: Config
): Promise<Ref<Document>> {
  const { owner, space } = config
  console.log('Creating document from extracted data')

  const templateId = await createTemplateIfNotExist(txops, extractedFile.prefix, config)
  const { title, prefix, oldId } = extractedFile

  const docId: Ref<ControlledDocument> = generateId()
  const ccRecordId = generateId<ChangeControl>()

  const data: AttachedData<ControlledDocument> = {
    title,
    prefix,
    code: oldId,
    seqNumber: 0,
    major: 0,
    minor: 1,
    commentSequence: 0,
    template: templateId,
    state: DocumentState.Draft,
    requests: 0,
    reviewers: [],
    approvers: [],
    coAuthors: [],
    changeControl: ccRecordId,
    author: owner,
    owner,
    category: '' as Ref<DocumentCategory>,
    abstract: '',
    effectiveDate: 0,
    reviewInterval: DEFAULT_PERIODIC_REVIEW_INTERVAL,
    content: null,
    snapshots: 0,
    plannedEffectiveDate: 0
  }

  const ccRecord: Data<ChangeControl> = {
    description: '',
    reason: 'Imported document', // TODO: move to config
    impact: '',
    impactedDocuments: []
  }

  console.log('Creating controlled doc from template')

  const { success } = await createControlledDocFromTemplate(
    txops,
    templateId,
    docId,
    data,
    space,
    undefined,
    undefined,
    documents.class.ControlledDocument
  )
  if (!success) {
    throw new Error('Failed to create controlled document from template')
  }

  await createChangeControl(txops, ccRecordId, ccRecord, space)

  console.log('Done creating document')

  return docId
}

async function createTemplateIfNotExist (
  txops: TxOperations,
  prefix: string,
  config: Config
): Promise<Ref<DocumentTemplate>> {
  const { owner, space } = config

  console.log(`Getting template with doc ${prefix}`)

  const template = await txops.findOne(documents.mixin.DocumentTemplate, { docPrefix: prefix })
  if (template != null) {
    return template._id
  }

  console.log(`Creating template with doc prefix: ${prefix}`)

  const ccRecordId = generateId<ChangeControl>()
  const ccRecord: Data<ChangeControl> = {
    description: '',
    reason: 'Imported template', // TODO: move to config
    impact: '',
    impactedDocuments: []
  }

  const templateId: Ref<ControlledDocument> = generateId()
  const category = '' as Ref<DocumentCategory> // TODO: move to config
  const data = {
    title: 'Import template',
    code: '',
    seqNumber: 0,
    sections: 0,
    category,
    major: 0,
    minor: 1,
    commentSequence: 0,
    state: DocumentState.Draft,
    author: owner,
    requests: 0,
    reviewers: [],
    approvers: [],
    coAuthors: [],
    changeControl: ccRecordId,
    content: null,
    snapshots: 0,
    plannedEffectiveDate: 0
  }

  const { success } = await createDocumentTemplate(
    txops,
    documents.class.ControlledDocument,
    space,
    documents.mixin.DocumentTemplate,
    documents.ids.NoProject,
    undefined,
    templateId,
    prefix,
    data,
    category,
    owner
  )
  if (!success) {
    throw new Error('Failed to create document template')
  }

  await createChangeControl(txops, ccRecordId, ccRecord, space)

  console.log(`Done creating template with prefix: ${prefix}`)

  return templateId as unknown as Ref<DocumentTemplate>
}

async function createSections (
  ctx: MeasureContext,
  txops: TxOperations,
  extractedFile: ExtractedFile,
  config: Config,
  doc: Document
): Promise<void> {
  if (doc?.template == null) {
    throw new Error(`Invalid document: ${JSON.stringify(doc)}`)
  }

  const { collaboratorURL, token, workspaceId } = config
  const collaborator = getCollaboratorClient(workspaceId, token, collaboratorURL)

  console.log('Creating document content')

  const collabId = makeDocCollabId(doc, 'content')

  try {
    let content: string = ''
    for (const section of extractedFile.sections) {
      if (section.type !== 'generic') {
        continue
      }

      await processImages(ctx, txops, section, config, doc)

      content += `<h1>${section.title}</h1>${section.content}`
    }

    await collaborator.updateMarkup(collabId, content)
  } finally {
    // do nothing
  }
}

export async function processImages (
  ctx: MeasureContext,
  txops: TxOperations,
  section: ExtractedSection,
  config: Config,
  doc: Document
): Promise<void> {
  const dom = parseDocument(section.content)
  const imageNodes = findAll((n) => n.tagName === 'img', dom.children)

  const { storageAdapter, workspaceId, workspaceDataId, uploadURL } = config

  const imageUploads = imageNodes.map(async (img) => {
    const src = img.attribs.src
    const extracted = src.match(/^data:(.+);base64,(.+)/)

    if (extracted == null || extracted.length < 3) {
      console.warn(`Failed to extract image ${getOuterHTML(img).slice(0, 30)}`)
      return
    }

    const fileContentsBase64 = extracted[2]
    const fileContents = Buffer.from(fileContentsBase64, 'base64')
    const fileSize = fileContents.length
    const mimeType = extracted[1]
    const ext = mimeType.split('/')[1]
    const fileName = `${generateId()}.${ext}`

    // upload
    const uuid = generateId()
    const wsIds = {
      uuid: workspaceId,
      dataId: workspaceDataId,
      url: ''
    }
    await storageAdapter.put(ctx, wsIds, uuid, fileContents, mimeType, fileSize)

    // attachment
    const attachmentId: Ref<Attachment> = generateId()
    await txops.addCollection(
      attachment.class.Attachment,
      doc.space,
      doc._id,
      doc._class,
      'attachments',
      {
        file: uuid as Ref<Blob>,
        name: fileName,
        type: mimeType,
        size: fileSize,
        lastModified: Date.now()
      },
      attachmentId
    )

    img.attribs['file-id'] = uuid
    img.attribs.src = `${uploadURL}/${uuid}`
    img.attribs['data-type'] = 'image'
  })

  await Promise.all(imageUploads)

  section.content = getOuterHTML(dom)
}
