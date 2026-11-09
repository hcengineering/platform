//
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

import { OWNER_AUDIT_EVENTS } from '@hcengineering/core'
import {
  AUDIT_ATTRIBUTE_LABELS,
  AUDIT_EVENT_ITEMS,
  AUDIT_EVENT_LABELS,
  getAuditEventLabel,
  getAuditTarget
} from '../audit'
import setting from '../plugin'
import type { WorkspaceAuditEvent } from '@hcengineering/account-client'

jest.mock('@hcengineering/ui', () => ({
  StateType: { Positive: 'positive', Regular: 'regular', Negative: 'negative' }
}))

test('every owner event has a translated label and can be selected as a filter', () => {
  expect(AUDIT_EVENT_ITEMS.map(({ id }) => String(id)).sort((a, b) => a.localeCompare(b))).toEqual(
    [...OWNER_AUDIT_EVENTS].sort((a, b) => a.localeCompare(b))
  )
  for (const event of OWNER_AUDIT_EVENTS) {
    expect(AUDIT_EVENT_LABELS[event]).toBeTruthy()
    expect(getAuditEventLabel(event)).toBe(AUDIT_EVENT_LABELS[event])
  }
  expect(AUDIT_EVENT_ITEMS.some(({ id }) => id === 'account.rpc' || id === 'document.publish')).toBe(false)
})

test('uses the localized fallback for newer or technical event names', () => {
  expect(getAuditEventLabel('future.workspace.action')).toBe(setting.string.UnknownEvent)
  expect(getAuditEventLabel('account.login')).toBe(setting.string.UnknownEvent)
  expect(getAuditEventLabel('__proto__')).toBe(setting.string.UnknownEvent)
})

test('only human-readable attributes receive labels', () => {
  expect(AUDIT_ATTRIBUTE_LABELS.targetRole).toBe(setting.string.NewRole)
  for (const key of ['chunkIndex', 'chunkCount', 'accountIdsCount', 'method', 'errorCode']) {
    expect(AUDIT_ATTRIBUTE_LABELS[key]).toBeUndefined()
  }
})

test('resource targets are not treated as employee identities', () => {
  const event: WorkspaceAuditEvent = {
    eventId: 'event-id',
    occurredAt: 1000,
    sourceService: 'account',
    event: 'integration.create',
    outcome: 'succeeded',
    targetType: 'integration',
    targetId: 'integration-id',
    attributes: {}
  }
  expect(getAuditTarget(event)).toBeUndefined()
  const accountTarget: WorkspaceAuditEvent = { ...event, targetType: 'account', targetId: 'account-id' }
  expect(getAuditTarget(accountTarget)).toBe('account-id')
  const personTarget: WorkspaceAuditEvent = { ...event, attributes: { targetPersonUuid: 'person-id' } }
  expect(getAuditTarget(personTarget)).toBe('person-id')
})
