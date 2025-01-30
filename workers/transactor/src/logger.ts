//
// Copyright © 2025 Hardcore Engineering Inc.
//

import type { MeasureLogger, ParamsType } from '@hcengineering/core'

export class CloudFlareLogger implements MeasureLogger {
  error (message: string, obj?: Record<string, any>): void {
    const errMsg: Record<string, any> = {}
    // Check if obj has error inside, so we could send it to Analytics
    for (const v of Object.values(obj ?? {})) {
      if (v instanceof Error) {
        // Analytics.handleError(v)
        errMsg.error = v.message
        errMsg.stack = v.stack
      }
    }

    console.error({ message, ...obj, ...errMsg })
  }

  info (message: string, obj?: Record<string, any>): void {
    console.info({ message, ...obj })
  }

  warn (message: string, obj?: Record<string, any>): void {
    console.warn({ message, ...obj })
  }

  logOperation (operation: string, time: number, params: ParamsType): void {
    console.info({ time, ...params, message: operation })
  }

  childLogger (name: string, params: Record<string, string>): MeasureLogger {
    return this
  }

  async close (): Promise<void> {}
}
