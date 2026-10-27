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
import { type PushData, type PushSubscription } from '@hcengineering/notification'
import webpush, { type RequestOptions, WebPushError } from 'web-push'

/** Push endpoints return these when the subscription should be removed — not actionable server errors. */
const disposableSubscriptionPatterns = ['expired', 'Unregistered', 'No such subscription']

/**
 * How long (in seconds) the push service keeps an undelivered notification.
 * Without an explicit TTL web-push uses four weeks, so a device that was offline for a while
 * receives every stale notification at once when it comes back online.
 */
export const DEFAULT_PUSH_TTL_SECONDS = 24 * 60 * 60

export function parsePushTtl (value: string | undefined): number {
  if (value === undefined || value.trim() === '') return DEFAULT_PUSH_TTL_SECONDS
  const ttl = Number(value)
  return Number.isInteger(ttl) && ttl >= 0 ? ttl : DEFAULT_PUSH_TTL_SECONDS
}

export function getPushRequestOptions (ttl: number = DEFAULT_PUSH_TTL_SECONDS): RequestOptions {
  return { TTL: ttl }
}

export function webPushErrorBodyString (err: WebPushError): string {
  const b = err.body
  if (typeof b === 'string') return b
  try {
    return JSON.stringify(b)
  } catch {
    return String(b)
  }
}

export function isDisposableSubscriptionError (err: WebPushError): boolean {
  const body = webPushErrorBodyString(err)
  return disposableSubscriptionPatterns.some((p) => body.includes(p))
}

export async function sendPushToSubscription (
  ctx: MeasureContext,
  subscriptions: PushSubscription[],
  data: PushData,
  ttl: number = DEFAULT_PUSH_TTL_SECONDS
): Promise<Ref<PushSubscription>[]> {
  const result: Ref<PushSubscription>[] = []
  const options = getPushRequestOptions(ttl)
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(data), options)
    } catch (err: unknown) {
      if (err instanceof WebPushError) {
        if (isDisposableSubscriptionError(err)) {
          result.push(subscription._id)
        } else {
          ctx.warn('Web push failed for subscription', {
            statusCode: err.statusCode,
            body: err.body,
            subscriptionId: subscription._id
          })
        }
      } else {
        ctx.error('Unexpected error sending web push', { error: err, subscriptionId: subscription._id })
      }
    }
  }
  return result
}
