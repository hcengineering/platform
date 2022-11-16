import attachment, { Attachment } from '@hcengineering/attachment'
import { Class, Doc, generateId, Ref, Space, TxOperations, WorkspaceId } from '@hcengineering/core'
import { MinioService } from '@hcengineering/minio'
import faker from 'faker'
import PDFDocument from 'pdfkit'

export interface AttachmentOptions {
  min: number
  max: number
  deleteFactor: number // 0-100 value, will delete just added attachment, below min with rate
}

export async function addAttachments<T extends Doc> (
  options: AttachmentOptions,
  client: TxOperations,
  minio: MinioService,
  workspaceId: WorkspaceId,
  space: Ref<Space>,
  objectId: Ref<T>,
  _class: Ref<Class<T>>,
  collection: string
): Promise<void> {
  const attachmentCount = options.min + faker.datatype.number(options.max)
  for (let i = 0; i < attachmentCount; i++) {
    const attachmentId = `candidate-attachment-${generateId()}-${i}` as Ref<Attachment>

    const needDelete = i >= options.min && faker.datatype.number(100) > options.deleteFactor

    let bufLen = 0
    if (!needDelete) {
      const doc = new PDFDocument()
      doc.fontSize(16).text(faker.lorem.paragraph(faker.datatype.number(50)))

      doc.end()

      const buf = doc.read()
      bufLen = buf.length
      await minio.put(workspaceId, attachmentId, buf, bufLen, { 'Content-Type': 'application/pdf' })
    }

    await client.addCollection(
      attachment.class.Attachment,
      space,
      objectId,
      _class,
      'attachments',
      {
        name: faker.system.commonFileName('pdf'),
        file: attachmentId,
        type: 'application/pdf',
        size: bufLen,
        lastModified: faker.date.past().getTime()
      },
      attachmentId
    )

    if (needDelete) {
      await client.removeCollection(attachment.class.Attachment, space, attachmentId, objectId, _class, 'attachments')
    }
  }
}
