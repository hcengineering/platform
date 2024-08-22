import attachment, { Attachment } from '@hcengineering/attachment'
import { getClient as getCollaboratorClient } from '@hcengineering/collaborator-client'
import documents, {
  ChangeControl,
  CollaborativeDocumentSection,
  ControlledDocument,
  DEFAULT_PERIODIC_REVIEW_INTERVAL,
  DEFAULT_SECTION_TITLE,
  Document,
  DocumentCategory,
  DocumentState,
  DocumentTemplate,
  calcRank,
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
  makeCollaborativeDoc,
  systemAccountEmail,
  type Blob
} from '@hcengineering/core'
import { createClient, getTransactorEndpoint } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'
import { findAll, getOuterHTML } from 'domutils'
import { parseDocument } from 'htmlparser2'

import { Config } from './config'
import { ExtractedFile } from './extract/extract'
import { ExtractedSection } from './extract/sections'
import { compareStrExact } from './helpers'

export default async function importExtractedFile (
  ctx: MeasureContext,
  config: Config,
  extractedFile: ExtractedFile
): Promise<void> {
  const { workspaceId } = config
  const token = generateToken(systemAccountEmail, workspaceId)
  const transactorUrl = await getTransactorEndpoint(token, 'external')
  console.log(`Connecting to transactor: ${transactorUrl} (ws: '${workspaceId.name}')`)
  const connection = (await createClient(transactorUrl, token)) as CoreClient & BackupClient

  try {
    console.log(`Connected to ${transactorUrl}`)
    const txops = new TxOperations(connection, core.account.System)

    try {
      const docId = await createDocument(txops, extractedFile, config)
      const createdDoc = await txops.findOne(documents.class.Document, { _id: docId })
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
    sections: 0,
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
    content: makeCollaborativeDoc(generateId()),
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

  const { success } = await createControlledDocFromTemplate(txops, templateId, docId, data, space, undefined, undefined)
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
    content: makeCollaborativeDoc(generateId()),
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
    owner,
    {
      title: DEFAULT_SECTION_TITLE
    }
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
  doc?: Document
): Promise<void> {
  if (doc?.template == null) {
    throw new Error(`Invalid document: ${JSON.stringify(doc)}`)
  }

  const h = txops.getHierarchy()

  const { space, collaboratorURL, token, workspaceId } = config
  const collaborator = getCollaboratorClient(workspaceId, token, collaboratorURL)

  console.log('Creating document sections')

  const collabId = doc.content

  console.log(`Collab doc ID: ${collabId}`)

  const docSections = await txops.findAll(documents.class.DocumentSection, { attachedTo: doc._id })
  const shouldMergeSections = docSections.some((s) => s.title !== DEFAULT_SECTION_TITLE)

  try {
    let prevSection: { rank: string } | undefined
    for (const section of extractedFile.sections) {
      if (section.type !== 'generic') {
        continue
      }

      const existingSection = shouldMergeSections
        ? docSections.find((s) => s.title !== DEFAULT_SECTION_TITLE && compareStrExact(s.title, section.title))
        : undefined

      // skipping sections that are not present in the document/template
      if (shouldMergeSections && existingSection == null) {
        continue
      }

      if (existingSection == null) {
        const sectionData: AttachedData<CollaborativeDocumentSection> = {
          title: section.title,
          rank: calcRank(prevSection, undefined),
          key: section.id,
          collaboratorSectionId: section.id
        }

        console.log(`Creating section data: ${JSON.stringify(sectionData)}`)

        await txops.addCollection(
          documents.class.CollaborativeDocumentSection,
          space,
          doc._id,
          doc._class,
          'sections',
          sectionData,
          section.id
        )

        prevSection = sectionData
      } else {
        prevSection = existingSection
      }

      await processImages(ctx, txops, section, config)

      const collabSectionId =
        existingSection != null && h.isDerived(existingSection._class, documents.class.CollaborativeDocumentSection)
          ? (existingSection as CollaborativeDocumentSection).collaboratorSectionId
          : section.id

      await collaborator.updateContent(collabId, { [collabSectionId]: section.content })
    }

    // deleting the default section if it was the only one and there were other sections added from the extracted doc
    // doing it after import, so that the trigger doesn't re-create a new empty section
    if (
      docSections.length === 1 &&
      docSections[0].title === DEFAULT_SECTION_TITLE &&
      extractedFile.sections.some((es) => es.type === 'generic')
    ) {
      const defaultSection = docSections[0]

      await txops.removeCollection(
        defaultSection._class,
        defaultSection.space,
        defaultSection._id,
        doc._id,
        doc._class,
        'sections'
      )
    }
  } finally {
    // do nothing
  }
}

export async function processImages (
  ctx: MeasureContext,
  txops: TxOperations,
  section: ExtractedSection,
  config: Config
): Promise<void> {
  const dom = parseDocument(section.content)
  const imageNodes = findAll((n) => n.tagName === 'img', dom.children)

  const { storageAdapter, workspaceId, uploadURL, space } = config

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
    await storageAdapter.put(ctx, workspaceId, uuid, fileContents, mimeType, fileSize)

    // attachment
    const attachmentId: Ref<Attachment> = generateId()
    await txops.addCollection(
      attachment.class.Attachment,
      space,
      section.id,
      documents.class.CollaborativeDocumentSection,
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
