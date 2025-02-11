import core, { Client, MeasureContext, type WorkspaceId } from '@hcengineering/core'
import { Class, Doc, MarkupBlobRef, Ref, Space } from '@hcengineering/core/types/classes'
import { StorageAdapter } from '@hcengineering/server-core'
import { markupToMarkdown } from '@hcengineering/text'
import fs from 'fs'
import path from 'path'
import { Logger } from '..'

export enum ExportType {
  UNIFIED = 'unified',
  CSV = 'csv',
  JSON = 'json'
}

export class WorkspaceExporter {
  constructor (
    private readonly context: MeasureContext,
    private readonly client: Client,
    private readonly storage: StorageAdapter,
    private readonly logger: Logger,
    private readonly workspaceId: WorkspaceId
  ) {
  }

  private async resolveMarkupContent (blobRef: MarkupBlobRef): Promise<string> {
    try {
      // Read blob content directly from storage
      const buffer = await this.storage.read(this.context, this.workspaceId, blobRef)
      if (buffer === undefined) {
        this.logger.error(`Blob not found: ${blobRef}`)
        return ''
      }

      // Convert buffer to string to get markup content
      const markup = Buffer.concat(buffer as any).toString()

      // Convert markup to markdown
      return await markupToMarkdown(markup, '', '')
    } catch (err) {
      this.logger.error(`Failed to resolve markup content: ${blobRef}`, err)
      return ''
    }
  }

  private async processDocument (doc: Doc): Promise<any> {
    const processed: Record<string, any> = { ...doc }
    const hierarchy = this.client.getHierarchy()
    const attributes = hierarchy.getAllAttributes(doc._class)

    for (const [key, attr] of attributes) {
      if (attr.type._class === core.class.TypeCollaborativeDoc) {
        const blobRef = (doc as any)[key] as MarkupBlobRef
        if (blobRef != null) {
          processed[key] = await this.resolveMarkupContent(blobRef)
        }
      }
    }

    return processed
  }

  async exportDocuments (_class: Ref<Class<Doc>>, exportType: ExportType, outputDir: string): Promise<void> {
    // Get all documents of specified class
    const docs = await this.client.findAll(_class, {})

    // Group documents by space
    const docsBySpace = new Map<Ref<Space>, Doc[]>()

    for (const doc of docs) {
      const spaceId = doc.space
      if (!docsBySpace.has(spaceId)) {
        docsBySpace.set(spaceId, [])
      }
      docsBySpace.get(spaceId)?.push(doc)
    }

    // Create output directory if it doesn't exist
    await fs.promises.mkdir(outputDir, { recursive: true })

    // Save documents for each space to separate JSON files
    for (const [spaceId, spaceDocs] of docsBySpace) {
      const space = await this.client.findOne(core.class.Space, { _id: spaceId })
      if (space === undefined) {
        this.logger.error(`Space not found: ${spaceId}`)
        continue
      }

      // Process all documents to resolve markup content
      const processedDocs = await Promise.all(
        spaceDocs.map(async (doc) => await this.processDocument(doc))
      )

      const fileName = `${space.name ?? spaceId}.json`
      const filePath = path.join(outputDir, fileName)

      await fs.promises.writeFile(
        filePath,
        JSON.stringify(processedDocs, null, 2)
      )

      this.logger.log(`Exported ${processedDocs.length} documents to ${filePath}`)
    }
  }
}
