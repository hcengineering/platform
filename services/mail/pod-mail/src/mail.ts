//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
import { type SendMailOptions, type Transporter } from 'nodemailer'
import { LRUCache } from 'lru-cache'
import { createHash } from 'node:crypto'

import { Analytics } from '@hcengineering/analytics'
import { MeasureContext } from '@hcengineering/core'

import config from './config'
import { getDefaultTransport, getSmtpTransport } from './transport'

export class MailClient {
  private readonly transporter: Transporter
  private readonly transporterCache: LRUCache<string, Transporter>

  constructor () {
    this.transporter = getDefaultTransport(config)

    // Configure LRU cache for transporters
    this.transporterCache = new LRUCache<string, Transporter>({
      max: 50, // Maximum number of cached transporters
      ttl: 30 * 60 * 1000, // 30 minutes TTL
      dispose: (transporter: Transporter) => {
        // Close transporter connection when evicted from cache
        if ('close' in transporter && typeof transporter.close === 'function') {
          transporter.close()
        }
      },
      updateAgeOnGet: true, // Reset TTL on cache hit
      updateAgeOnHas: false
    })
  }

  async sendMessage (message: SendMailOptions, ctx: MeasureContext, password?: string | undefined): Promise<void> {
    const from = message.from as string
    const transporter = this.getTransporter(from, password)
    transporter.sendMail(message, (err, info) => {
      const messageInfo = `(from: ${from}, to: ${message.to as string})`
      if (err !== null) {
        ctx.error(`Failed to send email ${messageInfo}: ${err.message}`)
        Analytics.handleError(err)
      } else {
        ctx.info(`Email request ${messageInfo} sent: ${info?.response}`)
      }
    })
  }

  getTransporter (email: string, password?: string): Transporter {
    if (config.smtpConfig !== undefined && password != null && password !== '') {
      return this.getCachedTransporter(email, password)
    }
    return this.transporter
  }

  private getCachedTransporter (email: string, password: string): Transporter {
    const cacheKey = this.generateCacheKey(email, password)

    // Check if transporter exists in cache
    const cachedTransporter = this.transporterCache.get(cacheKey)
    if (cachedTransporter !== undefined) {
      return cachedTransporter
    }

    // Create new transporter and cache it
    if (config.smtpConfig === undefined) {
      throw new Error('SMTP config is required for custom transporter')
    }
    const newTransporter = getSmtpTransport(config.smtpConfig, email, password)
    this.transporterCache.set(cacheKey, newTransporter)

    return newTransporter
  }

  private generateCacheKey (email: string, password: string): string {
    const passwordHash = this.generateHash(password)
    return `${email}:${passwordHash}`
  }

  private generateHash (input: string): string {
    return createHash('sha256').update(input).digest('hex')
  }

  close (): void {
    this.transporterCache.clear()

    if (this.transporter?.close !== undefined) {
      this.transporter.close()
    }
  }
}
