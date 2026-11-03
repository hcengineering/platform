//
// Copyright © 2024 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
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
import type { MeasureContext } from '@hcengineering/core'
import { parseRoomName, type ParsedRoomName, type RoomMetadata } from '@hcengineering/love'
import type { WebhookEvent } from 'livekit-server-sdk'

/**
 * LiveKit webhook event types handled by the love service.
 *
 * WebhookProcessor.processEvent switches exhaustively over this union, so adding
 * an event here without a handler (or a handler without adding it here) fails to compile.
 */
export const SUPPORTED_WEBHOOK_EVENTS = [
  'participant_joined',
  'participant_left',
  'room_started',
  'room_finished',
  'egress_started',
  'egress_updated',
  'egress_ended'
] as const

export type SupportedWebhookEvent = (typeof SUPPORTED_WEBHOOK_EVENTS)[number]

const supportedWebhookEvents: ReadonlySet<string> = new Set(SUPPORTED_WEBHOOK_EVENTS)

export function isSupportedWebhookEvent (event: string): event is SupportedWebhookEvent {
  return supportedWebhookEvents.has(event)
}

/**
 * Recursively converts all BigInt values in an object to strings.
 * This is needed because JSON.stringify cannot handle BigInt values.
 */
export function convertBigIntToString (obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj
  }
  if (typeof obj === 'bigint') {
    return obj.toString()
  }
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToString)
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = convertBigIntToString(value)
    }
    return result
  }
  return obj
}

export function getWebhookRoomName (event: WebhookEvent): string | undefined {
  if (event.egressInfo != null && typeof event.egressInfo.roomName === 'string') return event.egressInfo.roomName
  if (typeof (event as any).roomName === 'string') return (event as any).roomName
  if (event.room != null && typeof event.room.name === 'string') return event.room.name
  return undefined
}

export interface RoutedWebhookEvent {
  event: WebhookEvent
  roomName: ParsedRoomName
}

/**
 * Decides whether a decoded LiveKit webhook should be queued, and for which room.
 * Returns undefined when the event must be dropped (unsupported type, foreign project, unknown room).
 */
export function routeWebhookEvent (
  ctx: MeasureContext,
  rawEvent: WebhookEvent,
  projectKey: string | undefined
): RoutedWebhookEvent | undefined {
  if (!isSupportedWebhookEvent(rawEvent.event)) {
    ctx.debug('Ignoring unsupported webhook event type', { event: rawEvent.event })
    return undefined
  }

  // Convert all BigInt values to strings to prevent serialization errors throughout the handler
  const event = convertBigIntToString(rawEvent) as WebhookEvent

  if (event.room?.metadata != null && event.room?.metadata !== '') {
    try {
      const metadata = JSON.parse(event.room.metadata) as RoomMetadata
      if (metadata.projectKey != null && metadata.projectKey !== projectKey) {
        ctx.info('Ignoring event from different project', { eventProjectKey: metadata.projectKey })
        return undefined
      }
    } catch (err: any) {
      ctx.error('Failed to parse room metadata', { error: err, room: JSON.stringify(event?.room, null, 2) })
    }
  }

  const roomStr = getWebhookRoomName(event)
  if (roomStr === undefined) {
    console.warn('No roomName available in event', { event: event.event })
    return undefined
  }

  const roomName = parseRoomName(roomStr)
  if (roomName === undefined) {
    ctx.info('Skipping event: invalid room name format', { roomName: roomStr, event: event.event })
    return undefined
  }

  return { event, roomName }
}
