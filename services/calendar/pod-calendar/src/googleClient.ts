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

import type { Credentials, OAuth2Client } from 'google-auth-library'
import { calendar_v3, google } from 'googleapis'
import { ProjectCredentials, State, Token, User, Watch, WatchBase } from './types'
import config from './config'
import { encode64 } from './base64'
import { Account, generateId, Ref } from '@hcengineering/core'
import { Collection, Db } from 'mongodb'
import { RateLimiter } from './rateLimiter'
import { CalendarClient } from './calendar'

export const DUMMY_RESOURCE = 'Dummy'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.calendars.readonly',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email'
]

export class GoogleClient {
  private me: string | undefined = undefined
  private readonly credentials: ProjectCredentials
  private readonly oAuth2Client: OAuth2Client
  readonly calendar: calendar_v3.Calendar
  private readonly tokens: Collection<Token>
  private readonly watches: Collection<Watch>

  private refreshTimer: NodeJS.Timeout | undefined = undefined

  readonly rateLimiter = new RateLimiter(1000, 500)

  constructor (
    private readonly user: User,
    mongo: Db,
    private readonly calendarClient: CalendarClient
  ) {
    this.tokens = mongo.collection<Token>('tokens')
    this.credentials = JSON.parse(config.Credentials)
    const { client_secret, client_id, redirect_uris } = this.credentials.web // eslint-disable-line
    this.oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]) // eslint-disable-line
    this.calendar = google.calendar({ version: 'v3', auth: this.oAuth2Client })
    this.watches = mongo.collection<WatchBase>('watch')
  }

  static getAutUrl (redirectURL: string, workspace: string, userId: Ref<Account>, token: string): string {
    const credentials = JSON.parse(config.Credentials)
    const { client_secret, client_id, redirect_uris } = credentials.web // eslint-disable-line
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]) // eslint-disable-line
    const state: State = {
      token,
      redirectURL,
      workspace,
      userId,
      email: ''
    }
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: encode64(JSON.stringify(state))
    })
    return authUrl
  }

  async signout (): Promise<void> {
    // get watch controller and unsubscibe
    await this.oAuth2Client.revokeCredentials()
    await this.tokens.deleteOne({
      userId: this.user.userId,
      workspace: this.user.workspace
    })
  }

  async init (token: Token): Promise<void> {
    await this.setToken(token)
    await this.refreshToken()
  }

  async authorize (code: string): Promise<string | undefined> {
    const token = await this.oAuth2Client.getToken(code)
    await this.setToken(token.tokens)
    const me = await this.getMe()
    const providedScopes = token.tokens.scope?.split(' ') ?? []
    for (const scope of SCOPES) {
      if (providedScopes.findIndex((p) => p === scope) === -1) {
        console.error(`Not all scopes provided, provided: ${providedScopes.join(', ')} required: ${SCOPES.join(', ')}`)
        return undefined
      }
    }
    await this.refreshToken()

    return me
  }

  close (): void {
    if (this.refreshTimer !== undefined) clearTimeout(this.refreshTimer)
  }

  async getMe (): Promise<string> {
    if (this.me !== undefined) {
      return this.me
    }

    const info = await google.oauth2({ version: 'v2', auth: this.oAuth2Client }).userinfo.get()
    this.me = info.data.email ?? ''
    return this.me
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

  async checkError (err: any): Promise<boolean> {
    if (err?.response?.data?.error === 'invalid_grant') {
      await this.calendarClient.cleanIntegration()
      return true
    }
    return false
  }

  private async updateToken (token: Credentials): Promise<void> {
    try {
      const currentToken = await this.getCurrentToken()
      if (currentToken != null) {
        await this.updateCurrentToken(token)
      } else {
        await this.tokens.insertOne({
          userId: this.user.userId,
          email: this.me ?? this.user.email,
          workspace: this.user.workspace,
          token: this.user.token,
          ...token
        })
      }
    } catch (err) {
      console.error('update token error', this.user.workspace, this.user.userId, err)
    }
  }

  private async refreshToken (): Promise<void> {
    try {
      const res = await this.oAuth2Client.refreshAccessToken()
      await this.updateToken(res.credentials)
      this.refreshTimer = setTimeout(
        () => {
          void this.refreshToken()
        },
        30 * 60 * 1000
      )
    } catch (err: any) {
      console.error("Couldn't refresh token, error:", err)
      if (err?.response?.data?.error === 'invalid_grant' || err.message === 'No refresh token is set.') {
        await this.calendarClient.cleanIntegration()
      } else {
        this.refreshTimer = setTimeout(
          () => {
            void this.refreshToken()
          },
          15 * 60 * 1000
        )
      }
      throw err
    }
  }

  private async getCurrentToken (): Promise<Token | null> {
    return await this.tokens.findOne({
      userId: this.user.userId,
      workspace: this.user.workspace,
      email: this.me ?? this.user.email
    })
  }

  private async updateCurrentToken (token: Credentials): Promise<void> {
    await this.tokens.updateOne(
      {
        userId: this.user.userId,
        workspace: this.user.workspace,
        email: this.me ?? this.user.email
      },
      {
        $set: {
          ...token
        }
      }
    )
  }

  async watchCalendar (): Promise<void> {
    try {
      const current = await this.watches.findOne({
        userId: this.user.userId,
        workspace: this.user.workspace,
        calendarId: null
      })
      if (current != null) {
        await this.rateLimiter.take(1)
        await this.calendar.channels.stop({ requestBody: { id: current.channelId, resourceId: current.resourceId } })
      }
      const channelId = generateId()
      const me = await this.getMe()
      const body = { id: channelId, address: config.WATCH_URL, type: 'webhook', token: `user=${me}&mode=calendar` }
      await this.rateLimiter.take(1)
      const res = await this.calendar.calendarList.watch({ requestBody: body })
      if (res.data.expiration != null && res.data.resourceId !== null) {
        if (current != null) {
          await this.watches.updateOne(
            {
              userId: this.user.userId,
              workspace: this.user.workspace,
              calendarId: null
            },
            {
              channelId,
              expired: Number.parseInt(res.data.expiration),
              resourceId: res.data.resourceId ?? ''
            }
          )
        } else {
          await this.watches.insertOne({
            calendarId: null,
            channelId,
            expired: Number.parseInt(res.data.expiration),
            resourceId: res.data.resourceId ?? '',
            userId: this.user.userId,
            workspace: this.user.workspace
          })
        }
      }
    } catch (err) {
      console.error('Calendar watch error', err)
    }
  }

  async watch (calendarId: string): Promise<boolean> {
    try {
      const current = await this.watches.findOne({
        userId: this.user.userId,
        workspace: this.user.workspace,
        calendarId
      })
      if (current != null) {
        await this.rateLimiter.take(1)
        await this.calendar.channels.stop({
          requestBody: { id: current.channelId, resourceId: current.resourceId }
        })
      }
      const channelId = generateId()
      const me = await this.getMe()
      const body = {
        id: channelId,
        address: config.WATCH_URL,
        type: 'webhook',
        token: `user=${me}&mode=events&calendarId=${calendarId}`
      }
      await this.rateLimiter.take(1)
      const res = await this.calendar.events.watch({ calendarId, requestBody: body })
      if (res.data.expiration != null && res.data.resourceId != null) {
        if (current != null) {
          await this.watches.updateOne(
            {
              userId: this.user.userId,
              workspace: this.user.workspace,
              calendarId
            },
            {
              channelId,
              expired: Number.parseInt(res.data.expiration),
              resourceId: res.data.resourceId ?? ''
            }
          )
        } else {
          await this.watches.insertOne({
            calendarId,
            channelId,
            expired: Number.parseInt(res.data.expiration),
            resourceId: res.data.resourceId ?? '',
            userId: this.user.userId,
            workspace: this.user.workspace
          })
        }
      }
      return true
    } catch (err: any) {
      if (err?.errors?.[0]?.reason === 'pushNotSupportedForRequestedResource') {
        return false
      } else {
        console.error('Watch error', err)
        await this.checkError(err)
        return false
      }
    }
  }
}
