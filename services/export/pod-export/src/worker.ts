import core, { Blob, MeasureContext, Ref, TxOperations, WorkspaceId } from '@hcengineering/core'
import drive, { createFile, Drive } from '@hcengineering/drive'
import { ExportTask } from '@hcengineering/export'
import { ExportType, WorkspaceExporter } from '@hcengineering/importer'
import { StorageAdapter } from '@hcengineering/server-core'
import { decodeToken } from '@hcengineering/server-token'
import { createReadStream, createWriteStream } from 'fs'
import fs from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { pipeline } from 'stream'
import { v4 as uuid } from 'uuid'
import { createGzip } from 'zlib'
import { ExportTaskQueue } from './queue'
import { createPlatformClient } from './server'

export class ExportWorker {
  runningTasks: number = 0
  resolveBusy: (() => void) | null = null

  constructor (
    private readonly context: MeasureContext,
    private readonly client: TxOperations,
    private readonly storage: StorageAdapter,
    private readonly queue: ExportTaskQueue,
    private readonly limit: number,
  ) {}

  hasAvailableThread (): boolean {
    return this.runningTasks < this.limit
  }

  async waitForAvailableThread (): Promise<void> {
    if (this.hasAvailableThread()) {
      return
    }
    await new Promise<void>((resolve) => {
      this.resolveBusy = resolve
    })
  }

  async start (isCanceled: () => boolean): Promise<void> {
    while (!isCanceled()) {
      await this.waitForAvailableThread()

      const task = await this.queue.dequeue()
      
      if (task === undefined) {
        await this.sleep()
      } else {
        void this.exec(async () => {
          await this.processExportTask(
            this.context.newChild('exportTask', {
              taskId: task._id,
              class: task.class // todo: exportPlugin.class.ExportTask ?
            }),
            task
          ).catch((err) => {
            this.context.error('Export task error', { err })
          })
        })
      }
    }
  }

  private async exec (op: () => Promise<void>): Promise<void> {
    this.runningTasks++

    await op().finally(() => {
      this.runningTasks--

      if (this.resolveBusy !== null) {
        this.resolveBusy()
        this.resolveBusy = null
      }
    })
  }

  private async processExportTask (ctx: MeasureContext, task: ExportTask): Promise<void> {
    const notifyProgress = (progress: number): Promise<void> => {
      return this.queue.updateProgress(task._id, progress)
    }

    const notifyInt = setInterval(() => { // todo: do this manually or remove
      void notifyProgress(task.progress)
    }, 5000)

    const tempDir = await fs.mkdtemp(join(tmpdir(), 'export-'))
    try {
      const client = await createPlatformClient(task.token)
      const { workspace } = decodeToken(task.token)
      const exporter = new WorkspaceExporter(
        ctx,
        client,
        this.storage,
        { // TODO: remove logger, use console.log instead
          log: (msg: string) => { ctx.info('export', { msg }) },
          error: (msg: string, err?: any) => { ctx.error('export-error', { msg, err }) }
        },
        workspace
      )

          // todo: move export code here
        await exporter.exportDocuments(task.class, task.type as unknown as ExportType, tempDir)

        const files = await fs.readdir(tempDir)
        if (files.length === 0) {
          throw new Error('No files were exported')
        }

        const hierarchy = client.getHierarchy()
        const className = hierarchy.getClass(task.class).label
        const archiveName = `export-${workspace.name}-${className}-${task.type}-${Date.now()}.gz`
        const archivePath = join(tempDir, archiveName)

        await this.saveToArchive(join(tempDir, files[0]), archivePath)
        await this.saveToDrive(ctx, workspace, archivePath, archiveName)
        
        await this.queue.complete(task._id, archivePath)
    } catch (err) {
      if (err instanceof Error) {
        await this.queue.fail(task._id, err.message)
      } else {
        // todo: how to get better message?
        await this.queue.fail(task._id, 'Unknown error')
      }
      
      throw err
     } finally { // 
        clearInterval(notifyInt)
        await fs.rm(tempDir, { recursive: true, force: true })
      }

  }

  async saveToArchive (inputDir: string, outputPath: string): Promise<void> {
    const gzip = createGzip()
    const source = createReadStream(inputDir)
    const destination = createWriteStream(outputPath)
  
    await pipeline(source, gzip, destination)
  }

  async saveToDrive (ctx: MeasureContext, workspace: WorkspaceId, archivePath: string, archiveName: string): Promise<void> {
    const exportDrive = await this.ensureExportDrive(this.client)

    const fileContent = await fs.readFile(archivePath)

    const blobId = uuid() as Ref<Blob>
    await this.storage.put(
        ctx,
        workspace,
        blobId,
        fileContent,
        'application/gzip',
        fileContent.length
    )

    await createFile(this.client, exportDrive, drive.ids.Root, {
        title: archiveName,
        file: blobId,
        size: fileContent.length,
        type: 'application/gzip',
        lastModified: Date.now()
    })
  }

  private async sleep (): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }

  async ensureExportDrive (client: TxOperations): Promise<Ref<Drive>> {
    const exportDrive = await client.findOne(drive.class.Drive, {
      name: 'Export'
    })
  
    if (exportDrive !== undefined) {
      return exportDrive._id
    }
  
    const driveId = await client.createDoc(
      drive.class.Drive,
      core.space.Space,
      {
        name: 'Export',
        description: 'Drive for exported files',
        private: false,
        archived: false,
        members: [],
        type: drive.spaceType.DefaultDrive,
        autoJoin: true
      }
    )
    return driveId
  }
}
