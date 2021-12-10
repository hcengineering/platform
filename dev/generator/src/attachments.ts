import attachment, { Attachment } from '@anticrm/attachment'
import { Class, Doc, generateId, Ref, Space, TxOperations } from '@anticrm/core'
import faker from 'faker'
import { Client } from 'minio'
import PDFDocument from 'pdfkit'

export interface AttachmentOptions {
  min: number
  max: number
  deleteFactor: number // 0-100 value, will delete just added attachment, below min with rate
}

export async function addAttachments<T extends Doc> (options: AttachmentOptions, client: TxOperations, minio: Client, dbName: string, space: Ref<Space>, objectId: Ref<T>, _class: Ref<Class<T>>, collection: string): Promise<void> {
  const attachmentCount = options.min + faker.datatype.number(options.max)
  for (let i = 0; i < attachmentCount; i++) {
    const attachmentId = `candidate-attachment-${generateId()}-${i}` as Ref<Attachment>

    const needDelete = i >= options.min && (faker.datatype.number(100) > options.deleteFactor)

    let bufLen = 0
    if (!needDelete) {
      const doc = new PDFDocument()
      doc
        .fontSize(16)
        .text(faker.lorem.paragraph(faker.datatype.number(50)))

      doc.end()

      const buf = doc.read()
      bufLen = buf.length
      await minio.putObject(dbName, attachmentId, buf, bufLen, { 'Content-Type': 'application/pdf' })
    }

    await client.addCollection(attachment.class.Attachment, space, objectId, _class, 'attachments', {
      name: faker.system.commonFileName('pdf'),
      file: attachmentId,
      type: 'application/pdf',
      size: bufLen,
      lastModified: faker.date.past().getTime()
    }, attachmentId)

    if (needDelete) {
      await client.removeCollection(attachment.class.Attachment, space, attachmentId, objectId, _class, 'attachments')
    }
  }
}
