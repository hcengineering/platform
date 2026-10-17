//
// Copyright © 2026 Hardcore Engineering Inc.
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

import type { MeasureContext, Ref } from '@hcengineering/core'
import type { PushData, PushSubscription } from '@hcengineering/notification'
import webpush, { WebPushError } from 'web-push'
import {
  DEFAULT_PUSH_TTL_SECONDS,
  getPushRequestOptions,
  isDisposableSubscriptionError,
  parsePushTtl,
  sendPushToSubscription,
  webPushErrorBodyString
} from '../push'

jest.mock('web-push', () => {
  const actual = jest.requireActual<typeof import('web-push')>('web-push')
  return {
    __esModule: true,
    WebPushError: actual.WebPushError,
    default: {
      ...(actual ?? {}),
      sendNotification: jest.fn()
    }
  }
})

const sendNotificationMock = webpush.sendNotification as jest.MockedFunction<typeof webpush.sendNotification>

function mkWebPushError (body: string, statusCode: number = 410): WebPushError {
  return new WebPushError('push failed', statusCode, {}, body, 'https://push.example/ep')
}

function createMockMeasureContext (): MeasureContext {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    newChild: jest.fn(),
    with: jest.fn(),
    withSync: jest.fn(),
    extractMeta: jest.fn(() => ({})),
    contextData: {},
    getParams: jest.fn(() => ({})),
    measure: jest.fn(),
    end: jest.fn()
  } as unknown as MeasureContext
}

function mkSubscription (id: string): PushSubscription {
  const sub: PushSubscription = {
    _id: id as Ref<PushSubscription>,
    endpoint: 'https://push.example/ep',
    keys: { p256dh: 'p256', auth: 'auth' },
    user: 'user-1' as never,
    space: 'space-1' as never,
    modifiedOn: 0,
    modifiedBy: 'user-1' as never
  } as any
  return sub
}

const sampleData: PushData = { title: 't', body: 'b' }

describe('parsePushTtl', () => {
  it('falls back to the default when not set', () => {
    expect(parsePushTtl(undefined)).toBe(DEFAULT_PUSH_TTL_SECONDS)
    expect(parsePushTtl('')).toBe(DEFAULT_PUSH_TTL_SECONDS)
  })

  it('accepts non-negative integer seconds', () => {
    expect(parsePushTtl('0')).toBe(0)
    expect(parsePushTtl('86400')).toBe(86400)
  })

  it.each(['abc', '-1', '1.5'])('falls back to the default for invalid value %s', (value) => {
    expect(parsePushTtl(value)).toBe(DEFAULT_PUSH_TTL_SECONDS)
  })
})

describe('getPushRequestOptions', () => {
  it('uses a TTL far below the four-week web-push default', () => {
    expect(getPushRequestOptions()).toEqual({ TTL: DEFAULT_PUSH_TTL_SECONDS })
    expect(DEFAULT_PUSH_TTL_SECONDS).toBeLessThanOrEqual(24 * 60 * 60)
  })

  it('uses the given TTL', () => {
    expect(getPushRequestOptions(120)).toEqual({ TTL: 120 })
  })
})

describe('webPushErrorBodyString', () => {
  it('returns string body as-is', () => {
    const err = mkWebPushError('subscription expired')
    expect(webPushErrorBodyString(err)).toBe('subscription expired')
  })
})

describe('isDisposableSubscriptionError', () => {
  it.each([
    ['expired', 'subscription expired'],
    ['Unregistered', 'push subscription Unregistered'],
    ['No such subscription', 'No such subscription']
  ])('matches disposable pattern %s', (_name, body) => {
    expect(isDisposableSubscriptionError(mkWebPushError(body))).toBe(true)
  })

  it('returns false for other push errors', () => {
    expect(isDisposableSubscriptionError(mkWebPushError('Rate limit exceeded', 429))).toBe(false)
  })
})

describe('sendPushToSubscription', () => {
  beforeEach(() => {
    sendNotificationMock.mockReset()
  })

  it('returns empty when all sends succeed', async () => {
    sendNotificationMock.mockResolvedValue({ statusCode: 201, body: '', headers: {} })
    const ctx = createMockMeasureContext()
    const subs = [mkSubscription('s1'), mkSubscription('s2')]
    const result = await sendPushToSubscription(ctx, subs, sampleData)
    expect(result).toEqual([])
    expect(sendNotificationMock).toHaveBeenCalledTimes(2)
    expect(sendNotificationMock).toHaveBeenCalledWith(subs[0], JSON.stringify(sampleData), {
      TTL: DEFAULT_PUSH_TTL_SECONDS
    })
    expect(ctx.warn).not.toHaveBeenCalled()
    expect(ctx.error).not.toHaveBeenCalled()
  })

  it('passes the configured TTL to web-push', async () => {
    sendNotificationMock.mockResolvedValue({ statusCode: 201, body: '', headers: {} })
    const ctx = createMockMeasureContext()
    const subs = [mkSubscription('s1')]
    await sendPushToSubscription(ctx, subs, sampleData, 300)
    expect(sendNotificationMock).toHaveBeenCalledWith(subs[0], JSON.stringify(sampleData), { TTL: 300 })
  })

  it('collects subscription id for disposable WebPushError', async () => {
    sendNotificationMock.mockRejectedValueOnce(mkWebPushError('Unregistered'))
    const ctx = createMockMeasureContext()
    const subs = [mkSubscription('drop-me')]
    const result = await sendPushToSubscription(ctx, subs, sampleData)
    expect(result).toEqual(['drop-me'])
    expect(ctx.warn).not.toHaveBeenCalled()
    expect(ctx.error).not.toHaveBeenCalled()
  })

  it('warns but does not collect id for non-disposable WebPushError', async () => {
    const wpe = mkWebPushError('Internal error', 500)
    sendNotificationMock.mockRejectedValueOnce(wpe)
    const ctx = createMockMeasureContext()
    const subs = [mkSubscription('keep-me')]
    const result = await sendPushToSubscription(ctx, subs, sampleData)
    expect(result).toEqual([])
    expect(ctx.warn).toHaveBeenCalledWith('Web push failed for subscription', {
      statusCode: 500,
      body: 'Internal error',
      subscriptionId: 'keep-me'
    })
    expect(ctx.error).not.toHaveBeenCalled()
  })

  it('logs unexpected errors', async () => {
    const boom = new TypeError('network')
    sendNotificationMock.mockRejectedValueOnce(boom)
    const ctx = createMockMeasureContext()
    const subs = [mkSubscription('sub-x')]
    const result = await sendPushToSubscription(ctx, subs, sampleData)
    expect(result).toEqual([])
    expect(ctx.error).toHaveBeenCalledWith('Unexpected error sending web push', {
      error: boom,
      subscriptionId: 'sub-x'
    })
    expect(ctx.warn).not.toHaveBeenCalled()
  })

  it('processes subscriptions independently', async () => {
    sendNotificationMock
      .mockResolvedValueOnce({ statusCode: 201, body: '', headers: {} })
      .mockRejectedValueOnce(mkWebPushError('expired'))
      .mockRejectedValueOnce(new Error('weird'))
    const ctx = createMockMeasureContext()
    const subs = [mkSubscription('a'), mkSubscription('b'), mkSubscription('c')]
    const result = await sendPushToSubscription(ctx, subs, sampleData)
    expect(result).toEqual(['b'])
    expect(ctx.warn).not.toHaveBeenCalled()
    expect(ctx.error).toHaveBeenCalledTimes(1)
  })
})
