import { AccountClient } from '@hcengineering/account-client'
import { generateId, isActiveMode, MeasureContext, PersonId, WorkspaceUuid } from '@hcengineering/core'
import { Credentials, OAuth2Client } from 'google-auth-library'
import { calendar_v3 } from 'googleapis'
import config from './config'
import { getKvsClient } from './kvsUtils'
import { getRateLimitter, RateLimiter } from './rateLimiter'
import { CALENDAR_INTEGRATION, EventWatch, GoogleEmail, Token, User, Watch, WatchBase } from './types'
import { getGoogleClient } from './utils'

export class WatchClient {
  private readonly oAuth2Client: OAuth2Client
  private readonly calendar: calendar_v3.Calendar
  private readonly user: Token
  readonly rateLimiter: RateLimiter

  private constructor (token: Token) {
    this.user = token
    this.rateLimiter = getRateLimitter(this.user.email)

    const res = getGoogleClient()
    this.calendar = res.google
    this.oAuth2Client = res.auth
  }

  static async Create (token: Token): Promise<WatchClient> {
    const watchClient = new WatchClient(token)
    await watchClient.setToken(token)
    return watchClient
  }

  private async getWatches (): Promise<Record<string, Watch>> {
    const client = getKvsClient()
    const key = `${CALENDAR_INTEGRATION}:watch:${this.user.workspace}:${this.user.userId}:${this.user.email}`
    const watches = await client.listKeys<Watch>(key)
    return watches ?? {}
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
      const watches = await this.getWatches()
      const client = getKvsClient()
      for (const key in watches) {
        await client.deleteKey(key)
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
      await watchCalendars(this.user, this.user.email, this.calendar)
    } catch (err) {
      console.error('Calendar watch error', err)
    }
  }

  private async watchCalendar (current: EventWatch): Promise<void> {
    try {
      await this.unsubscribeWatch(current)
      await watchCalendar(this.user, this.user.email, current.calendarId, this.calendar)
    } catch (err: any) {
      await this.checkError(err)
    }
  }
}

async function watchCalendars (user: User, email: GoogleEmail, googleClient: calendar_v3.Calendar): Promise<void> {
  const channelId = generateId()
  const body = { id: channelId, address: config.WATCH_URL, type: 'webhook', token: `user=${email}&mode=calendar` }
  const res = await googleClient.calendarList.watch({ requestBody: body })
  if (res.data.expiration != null && res.data.resourceId !== null) {
    const client = getKvsClient()
    const key = `${CALENDAR_INTEGRATION}:watch:${user.workspace}:${user.userId}:${email}:null`
    await client.setValue<Watch>(key, {
      userId: user.userId,
      workspace: user.workspace,
      email,
      calendarId: null,
      channelId,
      expired: Number.parseInt(res.data.expiration),
      resourceId: res.data.resourceId ?? ''
    })
  }
}

async function watchCalendar (
  user: User,
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
    const key = `${CALENDAR_INTEGRATION}:watch:${user.workspace}:${user.userId}:${email}:${calendarId}`
    await client.setValue<Watch>(key, {
      userId: user.userId,
      workspace: user.workspace,
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

  private async getUserWatches (userId: PersonId, workspace: WorkspaceUuid): Promise<Record<string, Watch>> {
    const client = getKvsClient()
    const key = `${CALENDAR_INTEGRATION}:watch:${workspace}:${userId}`
    return (await client.listKeys<Watch>(key)) ?? {}
  }

  async unsubscribe (user: Token): Promise<void> {
    const client = getKvsClient()
    const watches = await this.getUserWatches(user.userId, user.workspace)
    for (const key in watches) {
      await client.deleteKey(key)
    }
    const token = await this.accountClient.getIntegrationSecret({
      socialId: user.userId,
      kind: CALENDAR_INTEGRATION,
      workspaceUuid: user.workspace,
      key: user.email
    })
    if (token == null) return
    const watchClient = await WatchClient.Create(user)
    await watchClient.unsubscribe(Object.values(watches))
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
    const key = `${CALENDAR_INTEGRATION}:watch:`
    const watches = (await client.listKeys<Watch>(key)) ?? {}
    const toRefresh: Watch[] = []
    for (const key in watches) {
      const watch = watches[key]
      if (watch.expired < expired) {
        toRefresh.push(watch)
      }
    }
    this.ctx.info('watch, found for update', { count: toRefresh.length })
    if (toRefresh.length === 0) return
    const groups = new Map<string, WatchBase[]>()
    const workspaces = new Set<WorkspaceUuid>()
    for (const watch of toRefresh) {
      workspaces.add(watch.workspace)
      const key = `${watch.userId}:${watch.workspace}`
      const group = groups.get(key)
      if (group !== undefined) {
        group.push(watch)
      } else {
        groups.set(key, [watch])
      }
    }
    const ids = [...workspaces]
    if (ids.length === 0) return
    const infos = await this.accountClient.getWorkspacesInfo(ids)
    const tokens = await this.accountClient.listIntegrationsSecrets({ kind: CALENDAR_INTEGRATION })
    for (const group of groups.values()) {
      try {
        const userId = group[0].userId
        const workspace = group[0].workspace
        const token = tokens.find((p) => p.workspaceUuid === workspace && p.socialId === userId)
        if (token === undefined) {
          const toRemove = await this.getUserWatches(userId, workspace)
          for (const key in toRemove) {
            await client.deleteKey(key)
          }
          continue
        }
        const info = infos.find((p) => p.uuid === workspace)
        if (info === undefined || !isActiveMode(info.mode)) {
          const toRemove = await this.getUserWatches(userId, workspace)
          for (const key in toRemove) {
            await client.deleteKey(key)
          }
          continue
        }
        const watchClient = await WatchClient.Create(JSON.parse(token.secret))
        await watchClient.subscribe(group)
      } catch {}
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
    const key = `${CALENDAR_INTEGRATION}:watch:${user.workspace}:${user.userId}:${email}:${calendarId ?? 'null'}`
    const exists = await client.getValue<Watch>(key)
    if (exists != null) {
      return
    }
    try {
      if (calendarId != null) {
        await watchCalendar(user, email, calendarId, googleClient)
      } else {
        await watchCalendars(user, email, googleClient)
      }
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
