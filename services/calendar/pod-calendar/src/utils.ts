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

import { AccountClient, IntegrationSecretKey } from '@hcengineering/account-client'
import { Event, RecurringRule, calendarIntegrationKind } from '@hcengineering/calendar'
import {
  Doc,
  Hierarchy,
  MeasureContext,
  Mixin,
  Ref,
  systemAccountUuid,
  Timestamp,
  WorkspaceUuid
} from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'
import { Credentials, OAuth2Client } from 'google-auth-library'
import { calendar_v3, google } from 'googleapis'
import config from './config'
import { GoogleEmail, ReccuringData, State, type Token, type User } from './types'

export class DeferredPromise<T = any> {
  public readonly promise: Promise<T>
  private _resolve: (x: T) => void = () => {}
  private _reject: (err: any) => void = () => {}

  constructor () {
    this.promise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve
      this._reject = reject
    })
  }

  get resolve (): typeof this._resolve {
    return this._resolve
  }

  get reject (): typeof this._reject {
    return this._reject
  }
}

export function isToken (user: User | Token | State): user is Token {
  return (user as Token).access_token !== undefined
}

export function parseRecurrenceStrings (recurrenceStrings: string[]): ReccuringData {
  const res: ReccuringData = {
    rdate: [],
    rules: [],
    exdate: []
  }
  for (const str of recurrenceStrings) {
    const [type, value] = str.split(':')
    if (type === 'RRULE') {
      res.rules.push(parseRecurrenceString(value))
    }
    if (type === 'EXDATE') {
      const values = value.split(',')
      for (const val of values) {
        try {
          res.exdate.push(new Date(val).getTime())
        } catch (err) {
          console.log('Convert exdate error', val)
        }
      }
    }
    if (type === 'RDATE') {
      const values = value.split(',')
      for (const val of values) {
        try {
          res.exdate.push(new Date(val).getTime())
        } catch (err) {
          console.log('Convert rdate error', val)
        }
      }
    }
  }
  return res
}

// parse 19700101T000000Z
function parseDate (dateString: string): Timestamp {
  const year = parseInt(dateString.slice(0, 4))
  const month = parseInt(dateString.slice(4, 6)) - 1
  const day = parseInt(dateString.slice(6, 8))
  const hour = parseInt(dateString.slice(9, 11))
  const minute = parseInt(dateString.slice(11, 13))
  const second = parseInt(dateString.slice(13, 15))

  return Date.UTC(year, month, day, isNaN(hour) ? 0 : hour, isNaN(minute) ? 0 : minute, isNaN(second) ? 0 : second)
}

function parseRecurrenceString (recurrenceString: string): RecurringRule {
  const rule: RecurringRule = {
    freq: 'DAILY' // Default frequency
  }

  const lines = recurrenceString.split(';')

  for (const line of lines) {
    const [property, value] = line.split('=')
    if (property !== undefined && value !== undefined) {
      switch (property) {
        case 'FREQ':
          rule.freq = value as RecurringRule['freq']
          break
        case 'UNTIL': {
          const res = parseDate(value)
          rule.endDate = res
          break
        }
        case 'COUNT':
          rule.count = parseInt(value, 10)
          break
        case 'INTERVAL':
          rule.interval = parseInt(value, 10)
          break
        case 'BYSECOND':
          rule.bySecond = value.split(',').map((s) => parseInt(s, 10))
          break
        case 'BYMINUTE':
          rule.byMinute = value.split(',').map((m) => parseInt(m, 10))
          break
        case 'BYHOUR':
          rule.byHour = value.split(',').map((h) => parseInt(h, 10))
          break
        case 'BYDAY':
          rule.byDay = value.split(',')
          break
        case 'BYMONTHDAY':
          rule.byMonthDay = value.split(',').map((d) => parseInt(d, 10))
          break
        case 'BYYEARDAY':
          rule.byYearDay = value.split(',').map((d) => parseInt(d, 10))
          break
        case 'BYWEEKNO':
          rule.byWeekNo = value.split(',').map((w) => parseInt(w, 10))
          break
        case 'BYMONTH':
          rule.byMonth = value.split(',').map((m) => parseInt(m, 10))
          break
        case 'BYSETPOS':
          rule.bySetPos = value.split(',').map((s) => parseInt(s, 10))
          break
        case 'WKST':
          rule.wkst = value as RecurringRule['wkst']
          break
        default:
          // Ignore unrecognized properties
          break
      }
    }
  }

  return rule
}

function encodeRecurringRuleToRFC5545 (rule: RecurringRule): string {
  let result = `RRULE:FREQ=${rule.freq}`

  if (rule.endDate !== undefined) {
    const endDate = new Date(rule.endDate)
    const endDateString = endDate.toISOString().replace(/-|:|\.\d+/g, '')
    result += `;UNTIL=${endDateString}`
  }

  if (rule.count !== undefined) {
    result += `;COUNT=${rule.count}`
  }

  if (rule.interval !== undefined) {
    result += `;INTERVAL=${rule.interval}`
  }

  if (rule.bySecond != null && rule.bySecond.length > 0) {
    result += `;BYSECOND=${rule.bySecond.join(',')}`
  }

  if (rule.byMinute != null && rule.byMinute.length > 0) {
    result += `;BYMINUTE=${rule.byMinute.join(',')}`
  }

  if (rule.byHour != null && rule.byHour.length > 0) {
    result += `;BYHOUR=${rule.byHour.join(',')}`
  }

  if (rule.byDay != null && rule.byDay.length > 0) {
    result += `;BYDAY=${rule.byDay.join(',')}`
  }

  if (rule.byMonthDay != null && rule.byMonthDay.length > 0) {
    result += `;BYMONTHDAY=${rule.byMonthDay.join(',')}`
  }

  if (rule.byYearDay != null && rule.byYearDay.length > 0) {
    result += `;BYYEARDAY=${rule.byYearDay.join(',')}`
  }

  if (rule.byWeekNo != null && rule.byWeekNo.length > 0) {
    result += `;BYWEEKNO=${rule.byWeekNo.join(',')}`
  }

  if (rule.byMonth != null && rule.byMonth.length > 0) {
    result += `;BYMONTH=${rule.byMonth.join(',')}`
  }

  if (rule.bySetPos != null && rule.bySetPos.length > 0) {
    result += `;BYSETPOS=${rule.bySetPos.join(',')}`
  }

  if (rule.wkst !== undefined) {
    result += `;WKST=${rule.wkst}`
  }

  return result
}

function encodeTimestampsToEXDATE (timestamps: Timestamp[]): string {
  const exdateValues = timestamps.map((timestamp) => {
    const date = new Date(timestamp)
    return date.toISOString().replace(/-|:|\.\d+/g, '')
  })

  const exdateString = `EXDATE:${exdateValues.join(',')}`
  return exdateString
}

function encodeTimestampsToRDATE (timestamps: Timestamp[]): string {
  const rdateValues = timestamps.map((timestamp) => {
    const date = new Date(timestamp)
    return date.toISOString().replace(/-|:|\.\d+/g, '')
  })

  const rdateString = `RDATE:${rdateValues.join(',')}`
  return rdateString
}

export function encodeReccuring (rules: RecurringRule[], rdates: number[], exdates: number[]): string[] {
  const res: string[] = []
  for (const rule of rules) {
    res.push(encodeRecurringRuleToRFC5545(rule))
  }
  if (rdates.length > 0) {
    res.push(encodeTimestampsToRDATE(rdates))
  }
  if (exdates.length > 0) {
    res.push(encodeTimestampsToEXDATE(exdates))
  }

  return res
}

let serviceToken: string | undefined

export function getServiceToken (): string {
  if (serviceToken === undefined) {
    serviceToken = generateServiceToken()
  }
  return serviceToken
}

export function getWorkspaceToken (workspace: WorkspaceUuid): string {
  return generateToken(systemAccountUuid, workspace, { service: calendarIntegrationKind })
}

function generateServiceToken (): string {
  return generateToken(systemAccountUuid, undefined, { service: calendarIntegrationKind })
}

export function getGoogleClient (): {
  auth: OAuth2Client
  google: calendar_v3.Calendar
} {
  const credentials = JSON.parse(config.Credentials)
  const { client_secret, client_id, redirect_uris } = credentials.web // eslint-disable-line
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]) // eslint-disable-line
  const googleClient = google.calendar({ version: 'v3', auth: oAuth2Client })
  return {
    auth: oAuth2Client,
    google: googleClient
  }
}

export async function setCredentials (oAuth2Client: OAuth2Client, credentials: Credentials): Promise<boolean> {
  try {
    oAuth2Client.setCredentials(credentials)
    await google.oauth2({ version: 'v2', auth: oAuth2Client }).userinfo.get()
    return true
  } catch (err: any) {
    if (err?.response?.data?.error === 'invalid_grant') {
      return false
    }
    throw err
  }
}

export async function removeIntegrationSecret (
  ctx: MeasureContext,
  accountClient: AccountClient,
  data: IntegrationSecretKey
): Promise<void> {
  try {
    await accountClient.deleteIntegrationSecret(data)
    const left = await accountClient.listIntegrationsSecrets(data)
    if (left.length === 0) {
      await accountClient.deleteIntegration(data)
    }
  } catch (err: any) {
    ctx.error('Failed to remove integration secret', { message: err.message, ...data })
  }
}

export function convertDate (
  value: number,
  allDay: boolean,
  timeZone: string | undefined
): calendar_v3.Schema$EventDateTime {
  return allDay
    ? { date: new Date(value).toISOString().split('T')[0] }
    : { dateTime: new Date(value).toISOString(), timeZone: timeZone ?? 'Etc/GMT' }
}

export function getTimezone (event: Event): string | undefined {
  return event.timeZone
}

export function getMixinFields (h: Hierarchy, event: Event): Record<string, any> {
  const res = {}
  for (const [k, v] of Object.entries(event)) {
    if (typeof v === 'object' && h.isMixin(k as Ref<Mixin<Doc>>)) {
      for (const [key, value] of Object.entries(v)) {
        if (value !== undefined) {
          const obj = (res as any)[k] ?? {}
          obj[key] = value
          ;(res as any)[k] = obj
        }
      }
    }
  }

  return res
}

export function parseEventDate (date: calendar_v3.Schema$EventDateTime | undefined): number {
  if (date?.dateTime != null) {
    return new Date(date.dateTime).getTime()
  }
  if (date?.date != null) {
    return new Date(date.date).getTime()
  }
  return 0
}

const users = new Map<GoogleEmail, Token[]>()

export function getUserByEmail (email: GoogleEmail): Token[] {
  return users.get(email) ?? []
}

export function addUserByEmail (user: Token, email: GoogleEmail): void {
  const curr = getUserByEmail(email)
  const exists = curr.find((p) => p.userId === user.userId && p.workspace === user.workspace)
  if (exists !== undefined) {
    return
  }
  curr.push(user)
  users.set(email, curr)
}

export function removeUserByEmail (user: User, email: GoogleEmail): void {
  const curr = getUserByEmail(email)
  const newCurr = curr.filter((p) => p.userId !== user.userId || p.workspace !== user.workspace)
  if (newCurr.length === 0) {
    users.delete(email)
  } else {
    users.set(email, newCurr)
  }
}
