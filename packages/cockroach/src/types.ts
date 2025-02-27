import { type ParameterOrJSON, type Row } from 'postgres'

export interface Logger {
  info: (message: string, data?: Record<string, any>) => void
  warn: (message: string, data?: Record<string, any>) => void
  error: (message: string, data?: Record<string, any>) => void
}

export interface Options {
  withLogs?: boolean
}

export interface SqlClient {
  execute: <T extends any[] = (Row & Iterable<Row>)[]>(query: string, params?: ParameterOrJSON<any>[]) => Promise<T>
  close: () => void
}
