import core, { generateId, MeasureContext, Ref, TxOperations, TxResult } from '@hcengineering/core'
import drive, { Drive } from '@hcengineering/drive'
import exportPlugin, { ExportTask, ExportTaskStatus } from '@hcengineering/export'
import { ExportType, WorkspaceExporter } from '@hcengineering/importer'
import { withRetryConnUntilTimeout } from '@hcengineering/server-client'
import { StorageAdapter } from '@hcengineering/server-core'
import { decodeToken } from '@hcengineering/server-token'
import { createReadStream, createWriteStream } from 'fs'
import fs from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { pipeline } from 'stream'
import { createGzip } from 'zlib'
import { createPlatformClient } from './server'
export class ExportWorker {
  runningTasks: number = 0
  resolveBusy: (() => void) | null = null

  constructor (
    private readonly context: MeasureContext,
    private readonly storage: StorageAdapter,
    private readonly limit: number,
    private readonly client: TxOperations
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

      const task = await this.getPendingTask()

      if (task === undefined) {
        await this.sleep()
      } else {
        void this.exec(async () => {
          await this.processExportTask(
            this.context.newChild('exportTask', {
              taskId: task._id,
              class: task.class
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

  private async getPendingTask (): Promise<ExportTask | undefined> {
    const tasks = await this.client.findAll(exportPlugin.class.ExportTask, {
      status: ExportTaskStatus.SCHEDULED,
      attempts: { $lt: 3 },
      $or: [
        { lastProcessingTime: { $exists: false } },
        { lastProcessingTime: { $lt: Date.now() - 5 * 60 * 1000 } }
      ]
    }, { limit: 1 })

    if (tasks.length === 0) return undefined

    const task = tasks[0] as ExportTask
    await this.client.updateDoc(exportPlugin.class.ExportTask, core.space.Space, task._id, {
      attempts: task.attempts + 1,
      status: ExportTaskStatus.PROCESSING,
      lastProcessingTime: Date.now()
    })

    return task
  }

  private async sleep (): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }

  // todo: update from server.ts
  // todo: add notifications
  private async processExportTask (ctx: MeasureContext, task: ExportTask): Promise<void> {
    const notifyProgress = (progress: number): Promise<TxResult> => {
      return withRetryConnUntilTimeout(
        () => this.client.update(task, { progress }),
        5000
      )()
    }

    const notifyInt = setInterval(() => {
      void notifyProgress(task.progress)
    }, 5000)

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

      const tempDir = await fs.mkdtemp(join(tmpdir(), 'export-'))
      try {
        // todo: move export code here
        await exporter.exportDocuments(task.class, task.type as unknown as ExportType, tempDir)

        // Копируем логику из server.ts для архивации и сохранения
        const hierarchy = client.getHierarchy()
        const className = hierarchy.getClass(task.class).label
        const archiveName = `export-${workspace.name}-${className}-${task.type}-${Date.now()}.gz`
        const archivePath = join(tempDir, archiveName)

        const files = await fs.readdir(tempDir)
        if (files.length === 0) {
          throw new Error('No files were exported')
        }

        await this.saveToArchive(join(tempDir, files[0]), archivePath)
        const exportDrive = await this.ensureExportDrive(this.client)

        await this.client.update(task, {
          status: ExportTaskStatus.COMPLETED,
          progress: 100,
          outputPath: archivePath,
          lastProcessingTime: Date.now()
        })
      } finally {
        clearInterval(notifyInt)
        await fs.rm(tempDir, { recursive: true, force: true })
      }
    } catch (err) {
      if (err instanceof Error) {
        await this.client.update(task, {
          status: ExportTaskStatus.FAILED,
          error: err.message,
          lastProcessingTime: Date.now()
        })
      } else {
        // todo: add error handling
      }
      throw err
    }
  }

  async ensureExportDrive (client: TxOperations): Promise<Ref<Drive>> {
    // Проверяем существование папки Export
    const exportDrive = await client.findOne(drive.class.Drive, {
      name: 'Export'
    })
  
    if (exportDrive !== undefined) {
      return exportDrive._id
    }
  
    // Создаем drive если не существует
    const driveId = generateId<Drive>()
    await client.createDoc(
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
      },
      driveId
    )
  
    return driveId
  }
  
  async saveToArchive (inputDir: string, outputPath: string): Promise<void> {
    const gzip = createGzip()
    const source = createReadStream(inputDir)
    const destination = createWriteStream(outputPath)
  
    await pipeline(source, gzip, destination)
  }
}
