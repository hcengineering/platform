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
import webpush, { WebPushError } from 'web-push'

/** Push endpoints return these when the subscription should be removed — not actionable server errors. */
const disposableSubscriptionPatterns = ['expired', 'Unregistered', 'No such subscription']

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
  data: PushData
): Promise<Ref<PushSubscription>[]> {
  const result: Ref<PushSubscription>[] = []
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(data))
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
