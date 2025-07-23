import { AccountClient } from '@hcengineering/account-client'
import { generateId, MeasureContext } from '@hcengineering/core'
import { Credentials, OAuth2Client } from 'google-auth-library'
import { calendar_v3 } from 'googleapis'
import { calendarIntegrationKind } from '@hcengineering/calendar'
import config from './config'
import { getKvsClient } from './kvsUtils'
import { getRateLimitter, RateLimiter } from './rateLimiter'
import { EventWatch, GoogleEmail, Token, User, Watch } from './types'
import { getGoogleClient } from './utils'

export class WatchClient {
  private readonly oAuth2Client: OAuth2Client
  private readonly calendar: calendar_v3.Calendar
  private readonly user: Token
  readonly rateLimiter: RateLimiter

  private constructor (
    private readonly ctx: MeasureContext,
    token: Token,
    private readonly accountClient: AccountClient
  ) {
    this.user = token
    this.rateLimiter = getRateLimitter(this.user.email)

    const res = getGoogleClient()
    this.calendar = res.google
    this.oAuth2Client = res.auth
  }

  static async Create (ctx: MeasureContext, token: Token, accountClient: AccountClient): Promise<WatchClient> {
    const watchClient = new WatchClient(ctx, token, accountClient)
    await watchClient.setToken(token)
    return watchClient
  }

  private async getWatches (): Promise<string[]> {
    const client = getKvsClient()
    const key = `${calendarIntegrationKind}:watch:${this.user.email}`
    const watches = await client.listKeys(key)
    return watches?.keys ?? []
  }

  private async setToken (token: Credentials): Promise<void> {
    try {
      this.oAuth2Client.setCredentials(token)
    } catch (err: any) {
      console.error('Set token error', this.user.workspace, this.user.userId, err)
      await this.checkError(err)
      throw err
    }
  }

  async checkError (err: any): Promise<void> {
    if (err?.response?.data?.error === 'invalid_grant') {
      await this.accountClient.deleteIntegrationSecret({
        socialId: this.user.userId,
        kind: calendarIntegrationKind,
        workspaceUuid: this.user.workspace,
        key: this.user.email
      })
      const active = await this.accountClient.listIntegrationsSecrets({
        kind: calendarIntegrationKind,
        key: this.user.email
      })
      if (active.length === 0) {
        const watches = await this.getWatches()
        const client = getKvsClient()
        for (const key of watches) {
          await client.deleteKey(key)
        }
      }
    }
  }

  async subscribe (watches: Watch[]): Promise<void> {
    for (const watch of watches) {
      if (watch.calendarId == null) {
        await this.watchCalendars(watch)
      } else {
        await this.watchCalendar(watch)
      }
    }
  }

  async unsubscribe (watches: Watch[]): Promise<void> {
    for (const watch of watches) {
      await this.unsubscribeWatch(watch)
    }
  }

  private async unsubscribeWatch (current: Watch): Promise<void> {
    try {
      await this.rateLimiter.take(1)
      await this.calendar.channels.stop({ requestBody: { id: current.channelId, resourceId: current.resourceId } })
    } catch {}
  }

  private async watchCalendars (current: Watch): Promise<void> {
    try {
      await this.unsubscribeWatch(current)
    } catch (err: any) {
      this.ctx.error('Calendars watch unsubscribe error', { message: err.message })
    }
    try {
      await watchCalendars(this.user.email, this.calendar)
    } catch (err) {
      this.ctx.error('Calendars watch error', { message: (err as any).message })
    }
  }

  private async watchCalendar (current: EventWatch): Promise<void> {
    try {
      await this.unsubscribeWatch(current)
    } catch (err: any) {
      this.ctx.error('Calendar watch unsubscribe error', { message: err.message })
    }
    try {
      await watchCalendar(this.user.email, current.calendarId, this.calendar)
    } catch (err: any) {
      this.ctx.error('Calendar watch error', { message: err.message, calendarId: current.calendarId })
    }
  }
}

async function watchCalendars (email: GoogleEmail, googleClient: calendar_v3.Calendar): Promise<void> {
  const channelId = generateId()
  const body = { id: channelId, address: config.WATCH_URL, type: 'webhook', token: `user=${email}&mode=calendar` }
  const res = await googleClient.calendarList.watch({ requestBody: body })
  if (res.data.expiration != null && res.data.resourceId !== null) {
    const client = getKvsClient()
    const key = `${calendarIntegrationKind}:watch:${email}:null`
    await client.setValue<Watch>(key, {
      email,
      calendarId: null,
      channelId,
      expired: Number.parseInt(res.data.expiration),
      resourceId: res.data.resourceId ?? ''
    })
  }
}

async function watchCalendar (
  email: GoogleEmail,
  calendarId: string,
  googleClient: calendar_v3.Calendar
): Promise<void> {
  const channelId = generateId()
  const body = {
    id: channelId,
    address: config.WATCH_URL,
    type: 'webhook',
    token: `user=${email}&mode=events&calendarId=${calendarId}`
  }
  const res = await googleClient.events.watch({ calendarId, requestBody: body })
  if (res.data.expiration != null && res.data.resourceId != null) {
    const client = getKvsClient()
    const key = `${calendarIntegrationKind}:watch:${email}:${calendarId}`
    await client.setValue<Watch>(key, {
      email,
      calendarId,
      channelId,
      expired: Number.parseInt(res.data.expiration),
      resourceId: res.data.resourceId ?? ''
    })
  }
}

// we have to refresh channels approx each week
export class WatchController {
  private timer: NodeJS.Timeout | undefined = undefined
  protected static _instance: WatchController

  private constructor (
    private readonly ctx: MeasureContext,
    private readonly accountClient: AccountClient
  ) {
    this.ctx.info('watch started')
  }

  static get (ctx: MeasureContext, accountClient: AccountClient): WatchController {
    if (WatchController._instance === undefined) {
      WatchController._instance = new WatchController(ctx, accountClient)
    }
    return WatchController._instance
  }

  private async getUserWatches (email: GoogleEmail): Promise<Record<string, Watch>> {
    const client = getKvsClient()
    const key = `${calendarIntegrationKind}:watch:${email}`
    const keys = (await client.listKeys(key))?.keys ?? []
    const res: Record<string, Watch> = {}
    for (const key of keys) {
      const watch = await client.getValue<Watch>(key)
      if (watch != null) {
        res[key] = watch
      }
    }
    return res
  }

  async unsubscribe (user: Token): Promise<void> {
    const active = await this.accountClient.listIntegrationsSecrets({
      kind: calendarIntegrationKind,
      key: user.email
    })
    if (active.length === 0) {
      const client = getKvsClient()
      const watches = await this.getUserWatches(user.email)
      for (const key in watches) {
        await client.deleteKey(key)
      }

      const watchClient = await WatchClient.Create(this.ctx, user, this.accountClient)
      await watchClient.unsubscribe(Object.values(watches))
    }
  }

  stop (): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer)
    }
  }

  startCheck (): void {
    this.timer = setInterval(
      () => {
        void this.checkAll()
      },
      1000 * 60 * 60 * 24
    )
    void this.checkAll()
  }

  async checkAll (): Promise<void> {
    const expired = Date.now() + 24 * 60 * 60 * 1000
    const client = getKvsClient()
    const key = `${calendarIntegrationKind}:watch:`
    const watches = await client.listKeys(key)
    const toRefresh: Watch[] = []
    for (const key of watches?.keys ?? []) {
      const watch = await client.getValue<Watch>(key)
      if (watch == null) continue
      if (watch.expired < expired) {
        toRefresh.push(watch)
      }
    }
    this.ctx.info('watch, found for update', { count: toRefresh.length })
    if (toRefresh.length === 0) return
    const groups = new Map<GoogleEmail, Watch[]>()
    for (const watch of toRefresh) {
      const curr = groups.get(watch.email) ?? []
      curr.push(watch)
      groups.set(watch.email, curr)
    }
    for (const group of groups) {
      const secrets = await this.accountClient.listIntegrationsSecrets({
        kind: calendarIntegrationKind,
        key: group[0]
      })
      for (const val of group[1]) {
        await client.deleteKey(`${calendarIntegrationKind}:watch:${group[0]}:${val.calendarId ?? 'null'}`)
      }
      for (const secret of secrets) {
        try {
          const watchClient = await WatchClient.Create(this.ctx, JSON.parse(secret.secret), this.accountClient)
          await watchClient.subscribe(group[1])
          break
        } catch {}
      }
    }
    this.ctx.info('watch check done')
  }

  async addWatch (
    user: User,
    email: GoogleEmail,
    calendarId: string | null,
    googleClient: calendar_v3.Calendar
  ): Promise<void> {
    const client = getKvsClient()
    const key = `${calendarIntegrationKind}:watch:${email}:${calendarId ?? 'null'}`
    const exists = await client.getValue<Watch>(key)
    if (exists != null) {
      this.ctx.info('Watch already exists', {
        workspace: user.workspace,
        user: user.userId,
        calendar: calendarId
      })
      return
    }
    try {
      if (calendarId != null) {
        await watchCalendar(email, calendarId, googleClient)
      } else {
        await watchCalendars(email, googleClient)
      }
      this.ctx.info('Watch added', {
        workspace: user.workspace,
        user: user.userId,
        calendar: calendarId
      })
    } catch (err: any) {
      this.ctx.error('Watch add error', {
        workspace: user.workspace,
        user: user.userId,
        calendar: calendarId,
        err: err.message
      })
    }
  }
}
