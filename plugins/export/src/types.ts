import { Doc, Ref, Class, WorkspaceId } from '@hcengineering/core'

export enum ExportTaskStatus {
  SCHEDULED = 'scheduled',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface ExportTask extends Doc {
  token: string
  class: Ref<Class<Doc>>
  type: ExportType
  status: ExportTaskStatus
  progress: number
  attempts: number
  lastProcessingTime?: number
  error?: string
  outputPath?: string
}

export enum ExportType {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf'
}