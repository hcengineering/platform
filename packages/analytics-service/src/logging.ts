//
// Copyright © 2024 Hardcore Engineering Inc.
//
import { MeasureLogger, ParamsType } from '@hcengineering/core'
import { basename, dirname, join } from 'path'
import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

export class SplitLogger implements MeasureLogger {
  logger: winston.Logger

  constructor (
    readonly name: string,
    readonly opts: { root?: string, parent?: winston.Logger, pretty?: boolean, enableConsole?: boolean }
  ) {
    const rootDir = this.opts.root ?? 'logs'

    this.logger = winston.createLogger({
      level: 'info',
      exitOnError: false
    })
    const errorPrinter = ({ message, stack, ...rest }: Error): object => ({
      message,
      stack,
      ...rest
    })
    const jsonOptions: winston.Logform.JsonOptions = {
      replacer: (key, value) => {
        return value instanceof Error ? errorPrinter(value) : value
      }
    }
    this.logger.add(
      new DailyRotateFile({
        format: winston.format.combine(
          winston.format.timestamp(),
          opts.pretty === true ? winston.format.prettyPrint() : winston.format.json(jsonOptions)
        ),
        filename: `${name}-combined-%DATE%.log`,
        auditFile: join(rootDir, `${basename(name)}-audit.log`),
        dirname: rootDir,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d'
      })
    )
    this.logger.add(
      new DailyRotateFile({
        format: winston.format.combine(winston.format.timestamp(), winston.format.prettyPrint()),
        filename: `${name}-error-%DATE%.log`,
        auditFile: join(rootDir, `${basename(name)}-audit.log`),
        level: 'error',
        dirname: rootDir,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d'
      })
    )
    if (opts.parent === undefined && opts.enableConsole === true) {
      console.log('Logging also into console', process.env.NODE_ENV, opts.enableConsole)
      this.logger.add(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(jsonOptions),
            winston.format.colorize({ all: true })
          )
        })
      )
    }
    this.logger.info(
      '####################################################################################################################'
    )
    this.logger.info(
      `########################SplitLogger ${this.name} initialized: ${new Date().toISOString()}###########################`
    )
  }

  error (message: string, obj?: Record<string, any>): void {
    if (this.opts.parent !== undefined) {
      this.opts.parent.error({ message, ...obj })
    }
    this.logger.error({ message, ...obj })
  }

  info (message: string, obj?: Record<string, any>): void {
    if (this.opts.parent !== undefined && this.opts.enableConsole === true) {
      // Only propogate if enable console is true
      this.opts.parent.info({ message, ...obj })
    }
    this.logger.info({ message, ...obj })
  }

  warn (message: string, obj?: Record<string, any>): void {
    if (this.opts.parent !== undefined) {
      this.opts.parent.warn({ message, ...obj })
    }
    this.logger.warn({ message, ...obj })
  }

  logOperation (operation: string, time: number, params: ParamsType): void {
    this.logger.info(operation, { time, ...params })
  }

  childLogger (name: string, params: Record<string, string>): MeasureLogger {
    const dirName = dirname(name)
    const { enableConsole, ...otherParams } = params
    const child = this.logger.child({ name, ...otherParams })
    return new SplitLogger(name, {
      ...this.opts,
      parent: child,
      root: join(this.opts.root ?? 'logs', dirName),
      enableConsole: enableConsole === 'true'
    })
  }

  async close (): Promise<void> {
    this.logger.close()
  }
}
