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

import { Integration } from '@hcengineering/account-client'
import { IntegrationKind, PersonId, WorkspaceUuid } from '@hcengineering/core'
import { isWorkspaceIntegration, isConnection, isSameIntegrationEvent } from '../utils'
import { IntegrationEventData } from '../types'

const testSocialId: PersonId = 'social-123' as PersonId
const testWorkspaceId: WorkspaceUuid = 'workspace-456' as WorkspaceUuid
const integrationKind: IntegrationKind = 'gmail' as IntegrationKind

describe('utils', () => {
  describe('isWorkspaceIntegration', () => {
    it('should return true for workspace integration', () => {
      const integration: Integration = {
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: testWorkspaceId,
        data: {}
      }

      expect(isWorkspaceIntegration(integration)).toBe(true)
    })

    it('should return false for connection (null workspaceUuid)', () => {
      const integration: Integration = {
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: null,
        data: {}
      }

      expect(isWorkspaceIntegration(integration)).toBe(false)
    })

    it('should return false for connection (undefined workspaceUuid)', () => {
      const integration: Integration = {
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: undefined,
        data: {}
      } as any

      expect(isWorkspaceIntegration(integration)).toBe(false)
    })
  })

  describe('isConnection', () => {
    it('should return true for connection (null workspaceUuid)', () => {
      const integration: Integration = {
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: null,
        data: {}
      }

      expect(isConnection(integration)).toBe(true)
    })

    it('should return true for connection (undefined workspaceUuid)', () => {
      const integration: Integration = {
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: undefined,
        data: {}
      } as any

      expect(isConnection(integration)).toBe(true)
    })

    it('should return false for workspace integration', () => {
      const integration: Integration = {
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: testWorkspaceId,
        data: {}
      }

      expect(isConnection(integration)).toBe(false)
    })
  })

  describe('isSameIntegrationEvent', () => {
    it('should return true for matching integration event', () => {
      const integration: Integration = {
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: testWorkspaceId,
        data: {}
      }

      const event: IntegrationEventData = {
        integration: {
          socialId: testSocialId,
          kind: integrationKind,
          workspaceUuid: testWorkspaceId,
          data: { different: 'data' }
        },
        timestamp: Date.now()
      }

      expect(isSameIntegrationEvent(event, integration)).toBe(true)
    })

    it('should return false for different socialId', () => {
      const integration: Integration = {
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: testWorkspaceId,
        data: {}
      }

      const event: IntegrationEventData = {
        integration: {
          socialId: 'different-social' as PersonId,
          kind: integrationKind,
          workspaceUuid: testWorkspaceId,
          data: {}
        },
        timestamp: Date.now()
      }

      expect(isSameIntegrationEvent(event, integration)).toBe(false)
    })

    it('should return false for different workspaceUuid', () => {
      const integration: Integration = {
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: testWorkspaceId,
        data: {}
      }

      const event: IntegrationEventData = {
        integration: {
          socialId: testSocialId,
          kind: integrationKind,
          workspaceUuid: 'different-workspace' as WorkspaceUuid,
          data: {}
        },
        timestamp: Date.now()
      }

      expect(isSameIntegrationEvent(event, integration)).toBe(false)
    })

    it('should return false when event integration is undefined', () => {
      const integration: Integration = {
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: testWorkspaceId,
        data: {}
      }

      const event: IntegrationEventData = {
        integration: undefined,
        timestamp: Date.now()
      } as any

      expect(isSameIntegrationEvent(event, integration)).toBe(false)
    })

    it('should handle connection vs workspace integration comparison', () => {
      const connectionIntegration: Integration = {
        socialId: testSocialId,
        kind: integrationKind,
        workspaceUuid: null,
        data: {}
      }

      const workspaceEvent: IntegrationEventData = {
        integration: {
          socialId: testSocialId,
          kind: integrationKind,
          workspaceUuid: testWorkspaceId,
          data: {}
        },
        timestamp: Date.now()
      }

      expect(isSameIntegrationEvent(workspaceEvent, connectionIntegration)).toBe(false)
    })
  })
})
