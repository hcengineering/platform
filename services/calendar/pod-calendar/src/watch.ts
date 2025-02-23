import { Collection, Db } from 'mongodb'
import { EventWatch, Token, Watch, WatchBase } from './types'
import { generateId, isActiveMode, systemAccountEmail } from '@hcengineering/core'
import { getWorkspacesInfo } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'
import config from './config'
import { Credentials, OAuth2Client } from 'google-auth-library'
import { calendar_v3, google } from 'googleapis'
import { RateLimiter } from './rateLimiter'

export class WatchClient {
  private readonly watches: Collection<Watch>
  private readonly oAuth2Client: OAuth2Client
  private readonly calendar: calendar_v3.Calendar
  private readonly user: Token
  private me: string = ''
  readonly rateLimiter = new RateLimiter(1000, 500)

  private constructor (mongo: Db, token: Token) {
    this.user = token
    this.watches = mongo.collection<WatchBase>('watch')
    const credentials = JSON.parse(config.Credentials)
    const { client_secret, client_id, redirect_uris } = credentials.web // eslint-disable-line
    this.oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]) // eslint-disable-line
    this.calendar = google.calendar({ version: 'v3', auth: this.oAuth2Client })
  }

  static async Create (mongo: Db, token: Token): Promise<WatchClient> {
    const watchClient = new WatchClient(mongo, token)
    await watchClient.init(token)
    return watchClient
  }

  private async setToken (token: Credentials): Promise<void> {
    try {
      this.oAuth2Client.setCredentials(token)
      const info = await google.oauth2({ version: 'v2', auth: this.oAuth2Client }).userinfo.get()
      this.me = info.data.email ?? ''
    } catch (err: any) {
      console.error('Set token error', this.user.workspace, this.user.userId, err)
      await this.checkError(err)
      throw err
    }
  }

  async checkError (err: any): Promise<void> {
    if (err?.response?.data?.error === 'invalid_grant') {
      await this.watches.deleteMany({ userId: this.user.userId, workspace: this.user.workspace })
    }
  }

  private async init (token: Token): Promise<void> {
    await this.setToken(token)
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
    await this.rateLimiter.take(1)
    await this.calendar.channels.stop({ requestBody: { id: current.channelId, resourceId: current.resourceId } })
  }

  private async watchCalendars (current: Watch): Promise<void> {
    try {
      await this.unsubscribeWatch(current)
      const channelId = generateId()
      const body = { id: channelId, address: config.WATCH_URL, type: 'webhook', token: `user=${this.me}&mode=calendar` }
      await this.rateLimiter.take(1)
      const res = await this.calendar.calendarList.watch({ requestBody: body })
      if (res.data.expiration != null && res.data.resourceId !== null) {
        // eslint-disable-next-line
        this.watches.updateOne(
          {
            userId: current.userId,
            workspace: current.workspace,
            calendarId: null
          },
          {
            $set: {
              channelId,
              expired: Number.parseInt(res.data.expiration),
              resourceId: res.data.resourceId ?? ''
            }
          }
        )
      }
    } catch (err) {
      console.error('Calendar watch error', err)
    }
  }

  private async watchCalendar (current: EventWatch): Promise<void> {
    try {
      await this.unsubscribeWatch(current)
      const channelId = generateId()
      const body = {
        id: channelId,
        address: config.WATCH_URL,
        type: 'webhook',
        token: `user=${this.me}&mode=events&calendarId=${current.calendarId}`
      }
      await this.rateLimiter.take(1)
      const res = await this.calendar.events.watch({ calendarId: current.calendarId, requestBody: body })
      if (res.data.expiration != null && res.data.resourceId != null) {
        // eslint-disable-next-line
        this.watches.updateOne(
          {
            userId: current.userId,
            workspace: current.workspace,
            calendarId: current.calendarId
          },
          {
            $set: {
              channelId,
              expired: Number.parseInt(res.data.expiration),
              resourceId: res.data.resourceId ?? ''
            }
          }
        )
      }
    } catch (err: any) {
      await this.checkError(err)
    }
  }
}

// we have to refresh channels approx each week
export class WatchController {
  private readonly watches: Collection<Watch>
  private readonly tokens: Collection<Token>

  private timer: NodeJS.Timeout | undefined = undefined
  protected static _instance: WatchController

  private constructor (private readonly mongo: Db) {
    this.watches = mongo.collection<WatchBase>('watch')
    this.tokens = mongo.collection<Token>('tokens')
    console.log('watch started')
  }

  static get (mongo: Db): WatchController {
    if (WatchController._instance !== undefined) {
      return WatchController._instance
    }
    return new WatchController(mongo)
  }

  async unsubscribe (user: Token): Promise<void> {
    const allWatches = await this.watches.find({ userId: user.userId, workspae: user.workspace }).toArray()
    await this.watches.deleteMany({ userId: user.userId, workspae: user.workspace })
    const token = this.tokens.findOne({ user: user.userId, workspace: user.workspace })
    if (token == null) return
    const watchClient = await WatchClient.Create(this.mongo, user)
    await watchClient.unsubscribe(allWatches)
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
    const watches = await this.watches
      .find({
        expired: { $lt: expired }
      })
      .toArray()
    console.log('watch, found for update', watches.length)
    const groups = new Map<string, WatchBase[]>()
    const workspaces = new Set<string>()
    for (const watch of watches) {
      workspaces.add(watch.workspace)
      const key = `${watch.userId}:${watch.workspace}`
      const group = groups.get(key)
      if (group !== undefined) {
        group.push(watch)
      } else {
        groups.set(key, [watch])
      }
    }
    const token = generateToken(systemAccountEmail, { name: '' })
    const infos = await getWorkspacesInfo(token, [...groups.keys()])
    const tokens = await this.tokens.find({ workspace: { $in: [...workspaces] } }).toArray()
    for (const group of groups.values()) {
      try {
        const userId = group[0].userId
        const workspace = group[0].workspace
        const token = tokens.find((p) => p.workspace === workspace && p.userId === userId)
        if (token === undefined) {
          await this.watches.deleteMany({ userId, workspace })
          continue
        }
        const info = infos.find((p) => p.workspace === workspace)
        if (info === undefined || isActiveMode(info.mode)) {
          await this.watches.deleteMany({ userId, workspace })
          continue
        }
        const watchClient = await WatchClient.Create(this.mongo, token)
        await watchClient.subscribe(group)
      } catch {}
    }
    console.log('watch check done')
  }
}
