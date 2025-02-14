import core, { Ref, TxOperations } from '@hcengineering/core'
import exportPlugin, { ExportTask, ExportTaskStatus } from '@hcengineering/export'

export class ExportTaskQueue {
  constructor (
    private readonly client: TxOperations
  ) {}

  /**
   * Add new task to queue
   */
  async enqueue (
    task: Omit<ExportTask, '_id' | 'status' | 'attempts' | 'progress' | 'lastProcessingTime' | 'createdOn' | 'createdBy'>
  ): Promise<Ref<ExportTask>> {
    const taskId = await this.client.createDoc(exportPlugin.class.ExportTask, core.space.Space, {
      ...task,
      status: ExportTaskStatus.SCHEDULED,
      attempts: 0,
      progress: 0
    })

    return taskId
  }

  /**
   * Get next task for processing
   */
  async dequeue (): Promise<ExportTask | undefined> {
    const tasks = await this.client.findAll(exportPlugin.class.ExportTask, {
      status: ExportTaskStatus.SCHEDULED,
      attempts: { $lt: 3 },
      $or: [
        { lastProcessingTime: { $exists: false } },
        { lastProcessingTime: { $lt: Date.now() - 5 * 60 * 1000 } }
      ]
    }, {
      sort: { createdOn: 1 },
      limit: 1
    })

    if (tasks.length === 0) return undefined

    const task = tasks[0]
    await this.client.update(task, {
      status: ExportTaskStatus.PROCESSING,
      attempts: task.attempts + 1,
      lastProcessingTime: Date.now()
    })

    return task
  }

  /**
   * Mark task as completed
   */
  async complete (taskId: Ref<ExportTask>, outputPath: string): Promise<void> {
    const task = await this.client.findOne(exportPlugin.class.ExportTask, { _id: taskId })
    if (task === undefined) return

    await this.client.update(task, {
      status: ExportTaskStatus.COMPLETED,
      progress: 100,
      outputPath,
      lastProcessingTime: Date.now()
    })
  }

  /**
   * Mark task as failed
   */
  async fail (taskId: Ref<ExportTask>, error: string): Promise<void> {
    const task = await this.client.findOne(exportPlugin.class.ExportTask, { _id: taskId })
    if (task === undefined) return

    await this.client.update(task, {
      status: ExportTaskStatus.FAILED,
      error,
      lastProcessingTime: Date.now()
    })
  }

  /**
   * Update task progress
   */
  async updateProgress (taskId: Ref<ExportTask>, progress: number): Promise<void> {
    const task = await this.client.findOne(exportPlugin.class.ExportTask, { _id: taskId })
    if (task === undefined) return

    await this.client.update(task, {
      progress
    })
  }
}
