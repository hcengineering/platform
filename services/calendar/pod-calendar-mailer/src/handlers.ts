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

import { type MeasureContext, type WorkspaceUuid } from '@hcengineering/core'
import { type EventCUDMessage } from './types'

export async function eventCreated (
  ctx: MeasureContext,
  workspaceUuid: WorkspaceUuid,
  message: EventCUDMessage
): Promise<void> {
  const { eventId } = message
  ctx.info('Event created', { workspaceUuid, eventId })
}

export async function eventUpdated (
  ctx: MeasureContext,
  workspaceUuid: WorkspaceUuid,
  message: EventCUDMessage
): Promise<void> {
  const { eventId } = message
  ctx.info('Event updated', { workspaceUuid, eventId })
}

export async function eventDeleted (
  ctx: MeasureContext,
  workspaceUuid: WorkspaceUuid,
  message: EventCUDMessage
): Promise<void> {
  const { eventId } = message
  ctx.info('Event deleted', { workspaceUuid, eventId })
}
