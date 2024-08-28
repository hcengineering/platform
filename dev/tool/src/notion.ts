import { generateId, type AttachedData, type Ref, type WorkspaceIdWithUrl, makeCollaborativeDoc, type MeasureMetricsContext, type TxOperations, type Blob } from '@hcengineering/core'
import { saveCollaborativeDoc } from '@hcengineering/collaboration'
import document, { type Document, type Teamspace } from '@hcengineering/document'
import { type StorageAdapter } from '@hcengineering/server-core'
import { MarkupMarkType, type MarkupNode, MarkupNodeType, parseMessageMarkdown, traverseNode, traverseNodeMarks, YDocFromContent } from '@hcengineering/text'

import { type Readable } from 'stream'
import yauzl, { type ZipFile, type Entry } from 'yauzl'
import attachment from '@hcengineering/model-attachment'
import { type Attachment } from '@hcengineering/attachment'

interface EntryMetadata {
  level: number
  isFolder: boolean
  extension?: string
}

interface DocumentMetadata {
  id: string
  name: string
  notionId: string
  notionParentId?: string
}

type ZipEntryCallback = (entry: Entry, zipFile: ZipFile) => Promise<void>
type ZipErrorCallback = (error: any) => void
type ZipEndCallback = () => Promise<void>

async function traverseZipFile (
  path: string,
  onEntryCallback: ZipEntryCallback,
  onErrorCallback: ZipErrorCallback,
  onceEndCallback: ZipEndCallback
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    yauzl.open(path, { lazyEntries: true, autoClose: false }, function (error, zipFile) {
      onErrorCallback(error)

      zipFile.on('entry', function (entry) {
        onEntryCallback(entry, zipFile)
          .then(() => {
            zipFile.readEntry()
          })
          .catch(onErrorCallback)
      })

      zipFile.on('error', function (error) {
        onErrorCallback(error)
        reject(error)
      })

      zipFile.once('end', function () {
        onceEndCallback()
          .then(() => {
            zipFile.close()
            resolve()
          })
          .catch(error => {
            onErrorCallback(error)
            reject(error)
          })
      })

      zipFile.readEntry()
    })
  })
}

export async function importFromNotion (
  zipPath: string,
  ws: WorkspaceIdWithUrl,
  storage: StorageAdapter,
  ctx: MeasureMetricsContext,
  txOp: TxOperations
): Promise<void> {
  const entryMetaMap = new Map<string, EntryMetadata>()
  const documentMetaMap = new Map<string, DocumentMetadata>()

  await collectMetadata(zipPath, entryMetaMap, documentMetaMap)
  await importDocuments(zipPath, entryMetaMap, documentMetaMap, ws, storage, ctx, txOp)
}

async function collectMetadata (
  zipPath: string,
  entryMetaMap: Map<string, EntryMetadata>,
  documentMetaMap: Map<string, DocumentMetadata>
): Promise<void> {
  await traverseZipFile(
    zipPath,
    collectEntryMetadataCallback(entryMetaMap, documentMetaMap),
    guardErrorHappened,
    async () => {
      console.log(entryMetaMap)
      console.log(documentMetaMap)
    }
  )
}

function collectEntryMetadataCallback (
  entryMetaMap: Map<string, EntryMetadata>,
  documentMetaMap: Map<string, DocumentMetadata>
): ZipEntryCallback {
  return (entry: Entry): Promise<void> => {
    console.log(entry.fileName)

    const pathParts = entry.fileName.split('/')
    const fileName = pathParts.pop() ?? entry.fileName

    const fileNameParts = fileName.split('.')
    const extension = fileNameParts.length > 1 ? fileNameParts.pop() : ''

    const nameWoExtension = extractFileNameWoExtension(fileName)

    entryMetaMap.set(nameWoExtension, {
      level: pathParts.length,
      isFolder: false,
      extension: extension?.toLowerCase()
    })

    const notionId = extractNotionId(nameWoExtension) ?? nameWoExtension
    const notionParentId = pathParts[pathParts.length - 1] !== undefined
      ? extractNotionId(pathParts[pathParts.length - 1])
      : undefined

    documentMetaMap.set(notionId, {
      id: generateId(),
      name: extractFileNameWoId(fileName),
      notionId,
      notionParentId
    })

    pathParts.forEach((folderName, i) => {
      if (!entryMetaMap.has(folderName)) {
        entryMetaMap.set(folderName, {
          level: i,
          isFolder: true
        })
      }
    })

    return Promise.resolve()
  }
}

async function importDocuments (
  zipPath: string,
  entryMetaMap: Map<string, EntryMetadata>,
  docMetaMap: Map<string, DocumentMetadata>,
  ws: WorkspaceIdWithUrl,
  storage: StorageAdapter,
  ctx: MeasureMetricsContext,
  txOp: TxOperations
): Promise<void> {
  await traverseZipFile(
    zipPath,
    importEntryCallback(entryMetaMap, docMetaMap, ws, storage, ctx, txOp),
    guardErrorHappened,
    async () => {
      console.log('Import finished successfully: ', zipPath)
    }
  )
}

function importEntryCallback (
  entryMetaMap: Map<string, EntryMetadata>,
  docMetaMap: Map<string, DocumentMetadata>,
  ws: WorkspaceIdWithUrl,
  storage: StorageAdapter,
  ctx: MeasureMetricsContext,
  txOp: TxOperations
): ZipEntryCallback {
  return async (entry: Entry, zipFile: ZipFile): Promise<void> => {
    await new Promise<void>((resolve, reject) => {
      const shortName = extractFileNameWoExtension(entry.fileName)
      const entryMeta = entryMetaMap.get(shortName)

      const notionId = extractNotionId(shortName) ?? shortName
      const docMeta = docMetaMap.get(notionId)

      if (entryMeta === undefined || docMeta === undefined) {
        reject(new Error('Cannot find metadata for entry: ' + entry.fileName))
        return
      }
      zipFile.openReadStream(entry, (error, data) => {
        guardErrorHappened(error)

        console.log('IMPORT DOC STARTED:', docMeta.name)
        const parentMeta = docMeta.notionParentId !== undefined
          ? docMetaMap.get(docMeta.notionParentId)
          : undefined

        const processEntryData = getDocumentDataProcessor(entryMeta, docMeta)
        processEntryData(ws, storage, ctx, txOp, data, docMeta, docMetaMap, parentMeta)
          .then(() => {
            console.log('IMPORT SUCCEED:', docMeta.name)
            resolve()
          })
          .catch((error) => {
            console.warn('IMPORT FAILED:', docMeta.name)
            console.warn(error)
            reject(error)
          })
      })
    })
  }
}

type DocumentDataProcessor = (
  ws: WorkspaceIdWithUrl,
  storage: StorageAdapter,
  ctx: MeasureMetricsContext,
  txOp: TxOperations,
  data: Readable,
  docMeta: DocumentMetadata,
  docMetaMap?: Map<string, DocumentMetadata>,
  parentMeta?: DocumentMetadata
) => Promise<void>

const MD_EXTENSION = 'md'
// const CSV_EXTENSION = 'csv'

function getDocumentDataProcessor (entryMeta: EntryMetadata, docMeta: DocumentMetadata): DocumentDataProcessor {
  if (entryMeta.extension === MD_EXTENSION) {
    console.log('PAGE: ', docMeta.name)
    return importPageDocument
  }
  if (!entryMeta.isFolder && entryMeta.extension !== '' && docMeta.name === '' && docMeta.notionParentId !== undefined) { // todo: double check: should be empty id, not name?
    console.log('ATTACHMENT: ', docMeta.id)
    return importAttachment
  }
  return skip
}

// if (meta.isFolder && meta.level === 1) {
//   return new TeamspaceProcessor()
// } else if (meta.extension === MD_EXTENSION) {
//    return new PageProcessor()
// } else if (meta.isFolder && meta.extension === CSV_EXTENSION) {
//   // todo: unreachanble state
//   return new DBPageProcessor()
// } else if (!meta.isFolder) {
//   return new AttachmentProcessor()
// }
// return new UnknownNodeProcessor()

async function importAttachment (
  ws: WorkspaceIdWithUrl,
  storage: StorageAdapter,
  ctx: MeasureMetricsContext,
  txOp: TxOperations,
  data: Readable,
  docMeta: DocumentMetadata,
  docMetaMap?: Map<string, DocumentMetadata>,
  parentMeta?: DocumentMetadata): Promise<void> {
  if (parentMeta === undefined) {
    await Promise.reject(new Error('Cannot import attachment without parent doc: ' + docMeta.id))
    return
  }

  await storage.put(ctx, ws, docMeta.id, data, 'unknown')

  const space = '66d802409799311e8647d820' as Ref<Teamspace>

  // todo: calculate size and contentType
  const attachedData: AttachedData<Attachment> = {
    file: docMeta.id as Ref<Blob>,
    name: docMeta.name,
    type: 'unknown',
    size: 0,
    lastModified: Date.now()
  }

  await txOp.addCollection(
    attachment.class.Attachment,
    space,
    parentMeta.id as Ref<Document>,
    document.class.Document,
    // 'embeddings' for images?
    'attachments',
    attachedData,
    docMeta.id as Ref<Attachment>
  )
}

async function importPageDocument (
  ws: WorkspaceIdWithUrl,
  storage: StorageAdapter,
  ctx: MeasureMetricsContext,
  txOp: TxOperations,
  data: Readable,
  docMeta: DocumentMetadata,
  docMetaMap?: Map<string, DocumentMetadata>,
  parentMeta?: DocumentMetadata
): Promise<void> {
  const md = await streamToString(data)
  // console.log(md)

  const json = parseMessageMarkdown(md ?? '', 'image://')
  if (docMetaMap !== undefined) {
    preProcessMarkdown(json, docMetaMap)
  }

  const yDoc = YDocFromContent(json, 'content')

  const id = docMeta.id as Ref<Document>
  const collabId = makeCollaborativeDoc(id, 'content')
  await saveCollaborativeDoc(storage, ws, collabId, yDoc, ctx)

  const space = '66d802409799311e8647d820' as Ref<Teamspace>

  const parentId = parentMeta !== undefined
    ? parentMeta.id as Ref<Document>
    : document.ids.NoParent

  const attachedFata: AttachedData<Document> = {
    name: docMeta.name,
    content: collabId,
    attachments: 0,
    children: 0,
    embeddings: 0,
    labels: 0,
    comments: 0,
    references: 0
  }

  await txOp.addCollection(
    document.class.Document,
    space,
    parentId,
    document.class.Document,
    'children',
    attachedFata,
    id
  )
}

function preProcessMarkdown (json: MarkupNode, docMetaMap: Map<string, DocumentMetadata>): void {
  traverseNode(json, (node) => {
    traverseNodeMarks(node, (mark) => {
      if (mark.type === MarkupMarkType.link) {
        const href = mark.attrs.href
        switch (getLinkType(href)) {
          case NOTION_MD_LINK_TYPES.UNKNOWN:
          case NOTION_MD_LINK_TYPES.EXTERNAL_LINK: {
            console.log('skip this type of link')
            return
          }
          case NOTION_MD_LINK_TYPES.INTERNAL_LINK: {
            const notionId = extractNotionId(href) ?? href
            const targetMeta = docMetaMap.get(notionId)
            console.log('Target HULY page ID:', targetMeta?.id)
            if (targetMeta !== undefined) {
              alterInternalLinkNode(node, targetMeta)
            } else {
              console.warn('Linked page not found (outside of this import): ' + href)
            }
            return
          }
          case NOTION_MD_LINK_TYPES.ATTACHMENT: {
            const shortName = extractFileNameWoExtension(href)
            const attachmentMeta = docMetaMap.get(shortName)
            if (attachmentMeta !== undefined) {
              console.log('Attachment found: ', attachmentMeta)
              alterAttachmentNode(node, attachmentMeta, shortName, href)
            }
          }
        }
      }
    })
    return true
  })
}

enum NOTION_MD_LINK_TYPES {
  INTERNAL_LINK,
  EXTERNAL_LINK,
  ATTACHMENT,
  // IMAGE
  // ANCHOR
  // DB
  UNKNOWN
}

function getLinkType (href: string): NOTION_MD_LINK_TYPES {
  console.log(href)
  if (isExternalLink(href)) return NOTION_MD_LINK_TYPES.EXTERNAL_LINK

  const notionId = extractNotionId(href)
  if (notionId !== null && notionId !== undefined && notionId !== '') { // todo: which one
    return NOTION_MD_LINK_TYPES.INTERNAL_LINK
  }

  const shortName = extractFileNameWoExtension(href)
  if (shortName !== undefined && shortName !== '') {
    return NOTION_MD_LINK_TYPES.ATTACHMENT
  }

  return NOTION_MD_LINK_TYPES.UNKNOWN
}

function alterAttachmentNode (node: MarkupNode, targetMeta: DocumentMetadata, shortName: string, href: string): void {
  node.type = MarkupNodeType.file
  node.attrs = {
    'file-id': targetMeta.id,
    'data-file-name': shortName, // todo: get from metadata
    'data-file-size': 0, // todo: get size and content type from somewhere
    'data-file-type': '',
    'data-file-href': href
  }
}

function alterInternalLinkNode (node: MarkupNode, targetMeta: DocumentMetadata): void {
  node.type = MarkupNodeType.reference
  node.attrs = {
    id: targetMeta.id,
    label: targetMeta.name,
    objectclass: document.class.Document
  }
}

async function skip (...args: any): Promise<void> {
  const { docMeta } = args
  console.warn('Unsupported entry type, skipping: ', docMeta)
  // await Promise.resolve()
}

function isExternalLink (href: any): boolean {
  return URL.canParse(href)
}

// todo: test: single failured entry causes overall import fail?
function guardErrorHappened (error: any): void {
  if (error !== null && error !== undefined) {
    throw error
  }
}

// todo: search for readable to string
function streamToString (stream: Readable): Promise<string> {
  const chunks: Uint8Array[] = []
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    stream.on('error', (error) => { reject(error) })
    stream.on('end', () => { resolve(Buffer.concat(chunks).toString('utf8')) })
  })
}

function extractFileNameWoExtension (fileName: string): string {
  const decoded = decodeURI(fileName)
  return decoded.substring(decoded.lastIndexOf('/') + 1, decoded.lastIndexOf('.'))
}

function extractFileNameWoId (fileName: string): string {
  const decoded = decodeURI(fileName)
  return decoded.substring(decoded.lastIndexOf('/') + 1, decoded.lastIndexOf(' '))
}

function extractNotionId (fileName: string): string | undefined {
  console.log('parseNotionId ', fileName)
  const decoded = decodeURI(fileName)
  console.log('decodedName', decoded)
  const matched = decoded.match(/ ([\w\d]*)(\.|$)/)
  console.log('parseNotionId ', matched !== null ? matched[1] : null)
  return matched !== null ? matched[1] : undefined
}
