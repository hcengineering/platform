import { type MeasureLogger, type ParamsType } from '@hcengineering/core'
import { createWriteStream, mkdirSync } from 'fs'
import { join } from 'path'

export class SimpleFileLogger implements MeasureLogger {
  private readonly stream: NodeJS.WritableStream
  private readonly children: SimpleFileLogger[] = []

  constructor (
    private readonly name: string,
    private readonly logDir: string = 'logs'
  ) {
    // Ensure log directory exists
    mkdirSync(logDir, { recursive: true })

    // Create write stream for logging
    const logPath = join(logDir, `${name}.log`)
    this.stream = createWriteStream(logPath, { flags: 'a' })
  }

  private writeLog (level: string, message: string, obj?: Record<string, any>): void {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      ...obj
    }
    this.stream.write(JSON.stringify(logEntry) + '\n')
  }

  info (message: string, obj?: Record<string, any>): void {
    this.writeLog('info', message, obj)
  }

  error (message: string, obj?: Record<string, any>): void {
    this.writeLog('error', message, obj)
  }

  warn (message: string, obj?: Record<string, any>): void {
    this.writeLog('warn', message, obj)
  }

  logOperation (operation: string, time: number, params: ParamsType): void {
    this.writeLog('operation', operation, { time, ...params })
  }

  childLogger (name: string, params: Record<string, any>): MeasureLogger {
    const child = new SimpleFileLogger(name, join(this.logDir, name))
    this.children.push(child)
    return child
  }

  async close (): Promise<void> {
    // Close all child loggers
    await Promise.all(this.children.map((child) => child.close()))

    // Close current stream
    await new Promise<void>((resolve, reject) => {
      this.stream.end(() => {
        resolve()
      })
    })
  }
}
