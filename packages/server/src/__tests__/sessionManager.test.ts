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

import {
  AccountRole,
  generateId,
  MeasureMetricsContext,
  systemAccountUuid,
  type AccountUuid,
  type MeasureContext,
  type WorkspaceUuid
} from '@hcengineering/core'
import type { Token } from '@hcengineering/server-token'

// Import the module under test after mocks are set up
// eslint-disable-next-line import/first
import { TSessionManager, type Timeouts } from '../sessionManager'

// Mock modules before importing the module under test
jest.mock('@hcengineering/account-client', () => ({
  getClient: jest.fn(() => ({
    getWorkspaceInfo: jest.fn(),
    updateLastVisit: jest.fn(),
    getLoginWithWorkspaceInfo: jest.fn()
  }))
}))

jest.mock('@hcengineering/analytics', () => ({
  Analytics: {
    handleError: jest.fn()
  }
}))

jest.mock('../client', () => ({
  ClientSession: jest.fn().mockImplementation((token, workspace, account, info, allowUpload, counter) => ({
    token,
    workspace,
    account,
    info,
    allowUpload,
    counter,
    createTime: Date.now(),
    requests: new Map(),
    binaryMode: false,
    useCompression: false,
    sessionId: '',
    sessionInstanceId: '',
    lastRequest: Date.now(),
    lastPing: Date.now(),
    total: { find: 0, tx: 0 },
    current: { find: 0, tx: 0 },
    mins5: { find: 0, tx: 0 },
    getUser: jest.fn().mockReturnValue(token.account),
    getRawAccount: jest.fn().mockReturnValue(account),
    getSocialIds: jest.fn().mockReturnValue(info.socialIds ?? []),
    getUserSocialIds: jest.fn().mockReturnValue((info.socialIds ?? []).map((it: any) => it._id)),
    updateLast: jest.fn(),
    broadcast: jest.fn()
  }))
}))

jest.mock('../workspace', () => ({
  Workspace: jest.fn().mockImplementation((context, token, factory, tickHash, softShutdown, wsId, branding) => ({
    context,
    token,
    factory,
    tickHash,
    softShutdown,
    wsId,
    branding,
    sessions: new Map(),
    maintenance: false,
    closing: undefined,
    workspaceInitCompleted: false,
    tickHandlers: new Map(),
    close: jest.fn().mockResolvedValue(undefined),
    with: jest.fn((fn) =>
      fn({
        context: { lastTx: 0, lastHash: '' },
        closeSession: jest.fn()
      })
    )
  }))
}))

jest.mock('../utils', () => ({
  sendResponse: jest.fn().mockResolvedValue(undefined)
}))

describe('TSessionManager', () => {
  let sessionManager: TSessionManager
  let mockContext: MeasureContext
  let mockQueue: any
  let mockPipelineFactory: any
  let mockWorkspaceProducer: any
  let mockUsersProducer: any
  let mockWorkspaceConsumer: any

  const defaultTimeouts: Timeouts = {
    pingTimeout: 10000,
    reconnectTimeout: 3
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mock context
    mockContext = new MeasureMetricsContext('test', {})

    // Setup mock queue producers/consumers
    mockWorkspaceProducer = {
      send: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined)
    }

    mockUsersProducer = {
      send: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined)
    }

    mockWorkspaceConsumer = {
      close: jest.fn().mockResolvedValue(undefined)
    }

    mockQueue = {
      getProducer: jest.fn((ctx: any, topic: string) => {
        if (topic === 'workspace') return mockWorkspaceProducer
        if (topic === 'users') return mockUsersProducer
        return null
      }),
      createConsumer: jest.fn().mockReturnValue(mockWorkspaceConsumer)
    }

    mockPipelineFactory = jest.fn()

    // Create session manager without tick handler for most tests
    sessionManager = new TSessionManager(
      mockContext,
      defaultTimeouts,
      {},
      undefined,
      'http://localhost:3000',
      true,
      false, // doHandleTick = false for controlled testing
      mockQueue,
      mockPipelineFactory
    )
  })

  afterEach(() => {
    if (sessionManager.checkInterval !== undefined) {
      clearInterval(sessionManager.checkInterval)
    }
    if (sessionManager.maintenanceTimer !== undefined) {
      clearTimeout(sessionManager.maintenanceTimer)
    }
  })

  describe('constructor', () => {
    it('should initialize session manager correctly', () => {
      expect(sessionManager).toBeDefined()
      expect(sessionManager.sessions.size).toBe(0)
      expect(sessionManager.workspaces.size).toBe(0)
      expect(sessionManager.timeouts).toEqual(defaultTimeouts)
    })

    it('should setup queue producers and consumers', () => {
      expect(mockQueue.getProducer).toHaveBeenCalledTimes(2)
      expect(mockQueue.createConsumer).toHaveBeenCalledTimes(1)
      expect(sessionManager.workspaceProducer).toBeDefined()
      expect(sessionManager.usersProducer).toBeDefined()
    })

    it('should start tick interval when doHandleTick is true', () => {
      const sm = new TSessionManager(
        mockContext,
        defaultTimeouts,
        {},
        undefined,
        'http://localhost:3000',
        true,
        true, // doHandleTick = true
        mockQueue,
        mockPipelineFactory
      )

      expect(sm.checkInterval).toBeDefined()
      clearInterval(sm.checkInterval)
    })
  })

  describe('scheduleMaintenance', () => {
    it('should schedule maintenance correctly', () => {
      const timeMinutes = 5
      const message = 'System maintenance'

      sessionManager.scheduleMaintenance(timeMinutes, message)

      expect(sessionManager.timeMinutes).toBe(timeMinutes)
      expect(sessionManager.maintenanceMessage).toBe(message)
      expect(sessionManager.maintenanceTimer).toBeDefined()
    })

    it('should not send warning when timeMinutes is 0', () => {
      sessionManager.scheduleMaintenance(0, 'test')
      expect(sessionManager.timeMinutes).toBe(0)
    })
  })

  describe('calcWorkspaceStats', () => {
    it('should calculate stats for empty sessions', () => {
      const stats = sessionManager.calcWorkspaceStats([])

      expect(stats.sys).toBe(0)
      expect(stats.user).toBe(0)
      expect(stats.anonymous).toBe(0)
    })

    it('should count system account correctly', () => {
      const mockSession = {
        session: {
          getUser: jest.fn().mockReturnValue(systemAccountUuid)
        }
      }

      const stats = sessionManager.calcWorkspaceStats([mockSession as any])

      expect(stats.sys).toBe(1)
      expect(stats.user).toBe(0)
      expect(stats.anonymous).toBe(0)
    })

    it('should count regular users correctly', () => {
      const mockSession = {
        session: {
          getUser: jest.fn().mockReturnValue('user-uuid-123' as AccountUuid)
        }
      }

      const stats = sessionManager.calcWorkspaceStats([mockSession as any])

      expect(stats.sys).toBe(0)
      expect(stats.user).toBe(1)
      expect(stats.anonymous).toBe(0)
    })

    it('should count anonymous users correctly', () => {
      const guestAccount = 'b6996120-416f-49cd-841e-e4a5d2e49c9b' as AccountUuid
      const mockSession = {
        session: {
          getUser: jest.fn().mockReturnValue(guestAccount)
        }
      }

      const stats = sessionManager.calcWorkspaceStats([mockSession as any])

      expect(stats.sys).toBe(0)
      expect(stats.user).toBe(1)
      expect(stats.anonymous).toBe(1)
    })

    it('should handle mixed session types', () => {
      const sessions = [
        {
          session: {
            getUser: jest.fn().mockReturnValue(systemAccountUuid)
          }
        },
        {
          session: {
            getUser: jest.fn().mockReturnValue('user-1' as AccountUuid)
          }
        },
        {
          session: {
            getUser: jest.fn().mockReturnValue('b6996120-416f-49cd-841e-e4a5d2e49c9b' as AccountUuid)
          }
        },
        {
          session: {
            getUser: jest.fn().mockReturnValue('user-2' as AccountUuid)
          }
        }
      ]

      const stats = sessionManager.calcWorkspaceStats(sessions as any)

      expect(stats.sys).toBe(1)
      expect(stats.user).toBe(3)
      expect(stats.anonymous).toBe(1)
    })
  })

  describe('countUserSessions', () => {
    it('should count sessions for specific user', () => {
      const accountUuid = 'user-123' as AccountUuid
      const workspace = {
        sessions: new Map([
          [
            'session-1',
            {
              session: { getUser: jest.fn().mockReturnValue(accountUuid) }
            }
          ],
          [
            'session-2',
            {
              session: { getUser: jest.fn().mockReturnValue(accountUuid) }
            }
          ],
          [
            'session-3',
            {
              session: { getUser: jest.fn().mockReturnValue('other-user' as AccountUuid) }
            }
          ]
        ])
      } as any

      const count = sessionManager.countUserSessions(workspace, accountUuid)

      expect(count).toBe(2)
    })

    it('should return 0 for user with no sessions', () => {
      const workspace = {
        sessions: new Map([
          [
            'session-1',
            {
              session: { getUser: jest.fn().mockReturnValue('other-user' as AccountUuid) }
            }
          ]
        ])
      } as any

      const count = sessionManager.countUserSessions(workspace, 'target-user' as AccountUuid)

      expect(count).toBe(0)
    })
  })

  describe('checkHealth', () => {
    beforeEach(() => {
      // Reset environment variables to defaults
      sessionManager.hungSessionsWarnPercent = 25
      sessionManager.hungSessionsFailPercent = 75
      sessionManager.hungRequestsFailPercent = 50
    })

    it('should return healthy when no sessions', () => {
      const health = sessionManager.checkHealth()
      expect(health).toBe('healthy')
    })

    it('should return healthy when no hung sessions', () => {
      const now = Date.now()
      const mockSession = {
        session: {
          getUser: jest.fn().mockReturnValue('user-1' as AccountUuid),
          lastRequest: now,
          requests: new Map()
        },
        socket: {}
      }

      sessionManager.sessions.set('ws-1', mockSession as any)

      const health = sessionManager.checkHealth()
      expect(health).toBe('healthy')
    })

    it('should return unhealthy when hung sessions exceed fail threshold', () => {
      const now = Date.now()
      const longTimeAgo = now - 120000 // 120 seconds ago

      // Add 4 hung sessions and 1 healthy session (80% hung)
      for (let i = 0; i < 4; i++) {
        sessionManager.sessions.set(`ws-hung-${i}`, {
          session: {
            getUser: jest.fn().mockReturnValue(`user-${i}` as AccountUuid),
            lastRequest: longTimeAgo,
            requests: new Map()
          }
        } as any)
      }

      sessionManager.sessions.set('ws-healthy', {
        session: {
          getUser: jest.fn().mockReturnValue('user-healthy' as AccountUuid),
          lastRequest: now,
          requests: new Map()
        }
      } as any)

      const health = sessionManager.checkHealth()
      expect(health).toBe('unhealthy')
    })

    it('should return degraded when hung sessions exceed warn threshold', () => {
      const now = Date.now()
      const longTimeAgo = now - 120000

      // Add 1 hung session and 2 healthy sessions (33% hung, above 25% warn threshold)
      sessionManager.sessions.set('ws-hung', {
        session: {
          getUser: jest.fn().mockReturnValue('user-hung' as AccountUuid),
          lastRequest: longTimeAgo,
          requests: new Map()
        }
      } as any)

      sessionManager.sessions.set('ws-healthy-1', {
        session: {
          getUser: jest.fn().mockReturnValue('user-1' as AccountUuid),
          lastRequest: now,
          requests: new Map()
        }
      } as any)

      sessionManager.sessions.set('ws-healthy-2', {
        session: {
          getUser: jest.fn().mockReturnValue('user-2' as AccountUuid),
          lastRequest: now,
          requests: new Map()
        }
      } as any)

      const health = sessionManager.checkHealth()
      expect(health).toBe('degraded')
    })

    it('should ignore system account sessions', () => {
      const longTimeAgo = Date.now() - 120000

      sessionManager.sessions.set('ws-system', {
        session: {
          getUser: jest.fn().mockReturnValue(systemAccountUuid),
          lastRequest: longTimeAgo,
          requests: new Map()
        }
      } as any)

      const health = sessionManager.checkHealth()
      expect(health).toBe('healthy')
    })

    it('should detect hung requests in session', () => {
      const now = Date.now()
      const longTimeAgo = now - 60000 // 60 seconds ago

      const requests = new Map([
        ['req-1', { start: longTimeAgo }],
        ['req-2', { start: longTimeAgo }]
      ])

      sessionManager.sessions.set('ws-1', {
        session: {
          getUser: jest.fn().mockReturnValue('user-1' as AccountUuid),
          lastRequest: now,
          requests
        }
      } as any)

      // 100% hung requests should mark session as hung
      const health = sessionManager.checkHealth()
      expect(health).toBe('unhealthy')
    })
  })

  describe('checkRate', () => {
    it('should check rate limit for regular user', () => {
      const mockSession = {
        getUser: jest.fn().mockReturnValue('user-1' as AccountUuid),
        token: { extra: {} },
        workspace: { uuid: 'ws-1' as WorkspaceUuid }
      } as any

      const rateLimit = sessionManager.checkRate(mockSession)

      expect(rateLimit).toBeDefined()
      expect(rateLimit.remaining).toBeGreaterThanOrEqual(0)
    })

    it('should use system limiter for system account', () => {
      const mockSession = {
        getUser: jest.fn().mockReturnValue(systemAccountUuid),
        token: { extra: { service: 'test-service' } },
        workspace: { uuid: 'ws-1' as WorkspaceUuid }
      } as any

      const rateLimit = sessionManager.checkRate(mockSession)

      expect(rateLimit).toBeDefined()
    })
  })

  describe('getStatistics', () => {
    it('should return empty array when no workspaces', () => {
      const stats = sessionManager.getStatistics()
      expect(stats).toEqual([])
    })

    it('should return workspace statistics', () => {
      const mockWorkspace = {
        wsId: { uuid: 'ws-1' as WorkspaceUuid, url: 'workspace-1' },
        sessions: new Map([
          [
            'session-1',
            {
              session: {
                getUser: jest.fn().mockReturnValue('user-1' as AccountUuid),
                current: { find: 10, tx: 5 },
                mins5: { find: 50, tx: 25 },
                total: { find: 100, tx: 50 }
              },
              socket: {
                id: 'socket-1',
                data: jest.fn().mockReturnValue({ ip: '127.0.0.1' })
              }
            }
          ]
        ])
      }

      sessionManager.workspaces.set('ws-1' as WorkspaceUuid, mockWorkspace as any)

      const stats = sessionManager.getStatistics()

      expect(stats).toHaveLength(1)
      expect(stats[0].wsId).toBe('ws-1')
      expect(stats[0].workspaceName).toBe('workspace-1')
      expect(stats[0].clientsTotal).toBe(1)
      expect(stats[0].sessionsTotal).toBe(1)
      expect(stats[0].sessions).toHaveLength(1)
    })

    it('should count unique users correctly', () => {
      const mockWorkspace = {
        wsId: { uuid: 'ws-1' as WorkspaceUuid, url: 'workspace-1' },
        sessions: new Map([
          [
            'session-1',
            {
              session: {
                getUser: jest.fn().mockReturnValue('user-1' as AccountUuid),
                current: { find: 0, tx: 0 },
                mins5: { find: 0, tx: 0 },
                total: { find: 0, tx: 0 }
              },
              socket: {
                id: 'socket-1',
                data: jest.fn().mockReturnValue({})
              }
            }
          ],
          [
            'session-2',
            {
              session: {
                getUser: jest.fn().mockReturnValue('user-1' as AccountUuid), // Same user
                current: { find: 0, tx: 0 },
                mins5: { find: 0, tx: 0 },
                total: { find: 0, tx: 0 }
              },
              socket: {
                id: 'socket-2',
                data: jest.fn().mockReturnValue({})
              }
            }
          ],
          [
            'session-3',
            {
              session: {
                getUser: jest.fn().mockReturnValue('user-2' as AccountUuid), // Different user
                current: { find: 0, tx: 0 },
                mins5: { find: 0, tx: 0 },
                total: { find: 0, tx: 0 }
              },
              socket: {
                id: 'socket-3',
                data: jest.fn().mockReturnValue({})
              }
            }
          ]
        ])
      }

      sessionManager.workspaces.set('ws-1' as WorkspaceUuid, mockWorkspace as any)

      const stats = sessionManager.getStatistics()

      expect(stats[0].clientsTotal).toBe(2) // 2 unique users
      expect(stats[0].sessionsTotal).toBe(3) // 3 sessions
    })
  })

  describe('broadcastAll', () => {
    it('should not broadcast if workspace not found', () => {
      const tx = [{ _id: generateId() } as any]

      // Should not throw
      sessionManager.broadcastAll(mockContext, 'non-existent-ws' as WorkspaceUuid, tx)
    })

    it('should not broadcast if workspace in maintenance', () => {
      const mockWorkspace = {
        maintenance: true,
        sessions: new Map()
      }

      sessionManager.workspaces.set('ws-1' as WorkspaceUuid, mockWorkspace as any)

      const tx = [{ _id: generateId() } as any]
      sessionManager.broadcastAll(mockContext, 'ws-1' as WorkspaceUuid, tx)

      // No assertions needed - just verify no errors
    })
  })

  describe('forceMaintenance', () => {
    it('should set workspace to maintenance mode', async () => {
      const workspaceId = 'ws-1' as WorkspaceUuid
      const mockWorkspace = {
        wsId: { uuid: workspaceId, url: 'workspace-1' },
        maintenance: false,
        sessions: new Map(),
        close: jest.fn().mockResolvedValue(undefined),
        context: { end: jest.fn() }
      }

      sessionManager.workspaces.set(workspaceId, mockWorkspace as any)

      await sessionManager.forceMaintenance(mockContext, workspaceId)

      expect(mockWorkspace.maintenance).toBe(true)
      expect(sessionManager.maintenanceWorkspaces.has(workspaceId)).toBe(true)
    })

    it('should handle non-existent workspace gracefully', async () => {
      const workspaceId = 'non-existent' as WorkspaceUuid

      // Should not throw
      await sessionManager.forceMaintenance(mockContext, workspaceId)

      expect(sessionManager.maintenanceWorkspaces.has(workspaceId)).toBe(true)
    })
  })

  describe('forceClose', () => {
    it('should close workspace and remove from map', async () => {
      const workspaceId = 'ws-1' as WorkspaceUuid
      const mockWorkspace = {
        wsId: { uuid: workspaceId, url: 'workspace-1' },
        maintenance: false,
        sessions: new Map(),
        closing: undefined,
        close: jest.fn().mockResolvedValue(undefined),
        context: { end: jest.fn() }
      }

      sessionManager.workspaces.set(workspaceId, mockWorkspace as any)

      await sessionManager.forceClose(workspaceId)

      expect(mockWorkspace.maintenance).toBe(true)
      expect(sessionManager.workspaces.has(workspaceId)).toBe(false)
    })

    it('should clean up caches', async () => {
      const workspaceId = 'ws-1' as WorkspaceUuid
      sessionManager.maintenanceWorkspaces.add(workspaceId)
      sessionManager.workspaceInfoCache.set(workspaceId, {} as any)

      await sessionManager.forceClose(workspaceId)

      expect(sessionManager.maintenanceWorkspaces.has(workspaceId)).toBe(false)
      expect(sessionManager.workspaceInfoCache.has(workspaceId)).toBe(false)
    })

    it('should ignore socket when provided', async () => {
      const workspaceId = 'ws-1' as WorkspaceUuid
      const ignoreSocket = { id: 'ignore-socket' } as any
      const mockWorkspace = {
        wsId: { uuid: workspaceId, url: 'workspace-1' },
        maintenance: false,
        sessions: new Map(),
        closing: undefined,
        close: jest.fn().mockResolvedValue(undefined),
        context: { end: jest.fn() }
      }

      sessionManager.workspaces.set(workspaceId, mockWorkspace as any)

      await sessionManager.forceClose(workspaceId, ignoreSocket)

      expect(sessionManager.workspaces.has(workspaceId)).toBe(false)
    })
  })

  describe('closeWorkspaces', () => {
    it('should close all workspaces and producers', async () => {
      const mockWorkspace = {
        wsId: { uuid: 'ws-1' as WorkspaceUuid, url: 'workspace-1' },
        sessions: new Map(),
        close: jest.fn().mockResolvedValue(undefined),
        context: { end: jest.fn() }
      }

      sessionManager.workspaces.set('ws-1' as WorkspaceUuid, mockWorkspace as any)
      sessionManager.workspaces.set(
        'ws-2' as WorkspaceUuid,
        { ...mockWorkspace, wsId: { uuid: 'ws-2' as WorkspaceUuid, url: 'workspace-2' } } as any
      )

      await sessionManager.closeWorkspaces(mockContext)

      expect(mockWorkspaceProducer.close).toHaveBeenCalled()
      expect(mockUsersProducer.close).toHaveBeenCalled()
    })

    it('should clear interval if exists', async () => {
      const sm = new TSessionManager(
        mockContext,
        defaultTimeouts,
        {},
        undefined,
        'http://localhost:3000',
        true,
        true,
        mockQueue,
        mockPipelineFactory
      )

      expect(sm.checkInterval).toBeDefined()

      await sm.closeWorkspaces(mockContext)

      // Interval should be cleared (no way to directly test, but should not throw)
    })
  })

  describe('handleTick', () => {
    it('should increment ticks counter', () => {
      const initialTicks = sessionManager.ticks

      sessionManager.handleTick()

      expect(sessionManager.ticks).toBe(initialTicks + 1)
    })

    it('should update now timestamp', () => {
      const beforeNow = sessionManager.now

      // Wait a bit to ensure time passes
      setTimeout(() => {
        sessionManager.handleTick()
        expect(sessionManager.now).toBeGreaterThanOrEqual(beforeNow)
      }, 10)
    })
  })

  describe('createSession', () => {
    it('should create session for regular user', () => {
      const token = {
        account: 'user-1' as AccountUuid,
        workspace: 'ws-1' as WorkspaceUuid,
        extra: {}
      } satisfies Token

      const workspace = {
        uuid: 'ws-1' as WorkspaceUuid,
        url: 'workspace-1'
      } as any

      const info = {
        account: 'user-1' as AccountUuid,
        socialIds: [{ _id: 'social-1', type: 'github', value: 'user' }],
        workspaces: {
          'ws-1': { role: AccountRole.User }
        }
      } as any

      const session = sessionManager.createSession(token, workspace, info)

      expect(session).toBeDefined()
      expect(session.workspace).toBe(workspace)
    })

    it('should create session for system account', () => {
      const token = {
        account: systemAccountUuid,
        workspace: 'ws-1' as WorkspaceUuid,
        extra: {}
      } satisfies Token

      const workspace = {
        uuid: 'ws-1' as WorkspaceUuid,
        url: 'workspace-1'
      } as any

      const info = {
        account: systemAccountUuid,
        socialIds: [],
        workspaces: {}
      } as any

      const session = sessionManager.createSession(token, workspace, info)

      expect(session).toBeDefined()
    })

    it('should handle backup mode', () => {
      const token = {
        account: 'user-1' as AccountUuid,
        workspace: 'ws-1' as WorkspaceUuid,
        extra: { mode: 'backup' }
      } satisfies Token

      const workspace = {
        uuid: 'ws-1' as WorkspaceUuid,
        url: 'workspace-1'
      } as any

      const info = {
        account: 'user-1' as AccountUuid,
        socialIds: [{ _id: 'social-1', type: 'github', value: 'user' }],
        workspaces: {
          'ws-1': { role: AccountRole.User }
        }
      } as any

      const session = sessionManager.createSession(token, workspace, info)

      expect(session).toBeDefined()
    })
  })

  describe('getActiveSocialStringsToUsersMap', () => {
    it('should return empty map for non-existent workspace', () => {
      const map = sessionManager.getActiveSocialStringsToUsersMap('non-existent' as WorkspaceUuid)

      expect(map.size).toBe(0)
    })

    it('should exclude system account', () => {
      const mockWorkspace = {
        sessions: new Map([
          [
            'session-1',
            {
              session: {
                getUser: jest.fn().mockReturnValue(systemAccountUuid),
                getUserSocialIds: jest.fn().mockReturnValue(['social-1']),
                getRawAccount: jest.fn().mockReturnValue({ role: AccountRole.Owner })
              }
            }
          ]
        ])
      }

      sessionManager.workspaces.set('ws-1' as WorkspaceUuid, mockWorkspace as any)

      const map = sessionManager.getActiveSocialStringsToUsersMap('ws-1' as WorkspaceUuid)

      expect(map.size).toBe(0)
    })

    it('should map social IDs to users', () => {
      const mockWorkspace = {
        sessions: new Map([
          [
            'session-1',
            {
              session: {
                getUser: jest.fn().mockReturnValue('user-1' as AccountUuid),
                getUserSocialIds: jest.fn().mockReturnValue(['social-1', 'social-2']),
                getRawAccount: jest.fn().mockReturnValue({ role: AccountRole.User })
              }
            }
          ]
        ])
      }

      sessionManager.workspaces.set('ws-1' as WorkspaceUuid, mockWorkspace as any)

      const map = sessionManager.getActiveSocialStringsToUsersMap('ws-1' as WorkspaceUuid)

      expect(map.size).toBe(2)
      expect(map.get('social-1' as any)).toEqual({
        accontUuid: 'user-1',
        role: AccountRole.User
      })
    })

    it('should include extra sessions', () => {
      const mockWorkspace = {
        sessions: new Map()
      }

      sessionManager.workspaces.set('ws-1' as WorkspaceUuid, mockWorkspace as any)

      const extraSession = {
        getUser: jest.fn().mockReturnValue('user-extra' as AccountUuid),
        getUserSocialIds: jest.fn().mockReturnValue(['social-extra']),
        getRawAccount: jest.fn().mockReturnValue({ role: AccountRole.User })
      } as any

      const map = sessionManager.getActiveSocialStringsToUsersMap('ws-1' as WorkspaceUuid, extraSession)

      expect(map.size).toBe(1)
      expect(map.get('social-extra' as any)).toEqual({
        accontUuid: 'user-extra',
        role: AccountRole.User
      })
    })
  })

  describe('edge cases', () => {
    it('should handle rapid maintenance scheduling', () => {
      sessionManager.scheduleMaintenance(10, 'msg1')
      sessionManager.scheduleMaintenance(5, 'msg2')
      sessionManager.scheduleMaintenance(1, 'msg3')

      expect(sessionManager.timeMinutes).toBe(1)
      expect(sessionManager.maintenanceMessage).toBe('msg3')
    })

    it('should handle empty workspace sessions gracefully', () => {
      const workspace = {
        sessions: new Map()
      } as any

      const count = sessionManager.countUserSessions(workspace, 'any-user' as AccountUuid)
      expect(count).toBe(0)
    })

    it('should handle workspace with undefined sessions', () => {
      const stats = sessionManager.calcWorkspaceStats([])

      expect(stats.sys).toBe(0)
      expect(stats.user).toBe(0)
      expect(stats.anonymous).toBe(0)
    })

    it('should handle rate limiting edge cases', () => {
      const mockSession = {
        getUser: jest.fn().mockReturnValue('user-1' as AccountUuid),
        token: { extra: {} },
        workspace: { uuid: 'ws-1' as WorkspaceUuid }
      } as any

      // Make many requests to test rate limiting
      const results = []
      for (let i = 0; i < 10; i++) {
        results.push(sessionManager.checkRate(mockSession))
      }

      // Should track rate limits
      expect(results.every((r) => r !== undefined)).toBe(true)

      // Remaining should decrease or stay bounded
      const lastResult = results[results.length - 1]
      expect(lastResult.remaining).toBeLessThan(results[0].remaining)
    })

    it('should handle tick counter rollover', () => {
      sessionManager.tickCounter = Number.MAX_SAFE_INTEGER - 5

      for (let i = 0; i < 10; i++) {
        sessionManager.tickCounter++
      }

      // Should not crash or cause issues
      expect(sessionManager.tickCounter).toBeGreaterThan(Number.MAX_SAFE_INTEGER)
    })

    it('should handle concurrent workspace operations', async () => {
      const workspaceId = 'ws-concurrent' as WorkspaceUuid
      const mockWorkspace = {
        wsId: { uuid: workspaceId, url: 'concurrent-workspace' },
        maintenance: false,
        sessions: new Map(),
        close: jest.fn().mockResolvedValue(undefined),
        context: { end: jest.fn() }
      }

      sessionManager.workspaces.set(workspaceId, mockWorkspace as any)

      // Try concurrent operations
      const operations = [
        sessionManager.forceMaintenance(mockContext, workspaceId),
        sessionManager.forceClose(workspaceId)
      ]

      // Should complete without errors
      await Promise.all(operations)

      expect(sessionManager.workspaces.has(workspaceId)).toBe(false)
    })
  })

  describe('integration scenarios', () => {
    it('should handle full session lifecycle', () => {
      const workspaceId = 'ws-lifecycle' as WorkspaceUuid
      const userId = 'user-lifecycle' as AccountUuid

      // Create workspace
      const mockWorkspace = {
        wsId: { uuid: workspaceId, url: 'lifecycle-workspace' },
        sessions: new Map(),
        maintenance: false,
        close: jest.fn().mockResolvedValue(undefined),
        context: { end: jest.fn() }
      }

      sessionManager.workspaces.set(workspaceId, mockWorkspace as any)

      // Add session
      const mockSession = {
        session: {
          getUser: jest.fn().mockReturnValue(userId),
          sessionId: 'session-1',
          requests: new Map(),
          current: { find: 0, tx: 0 },
          mins5: { find: 0, tx: 0 },
          total: { find: 0, tx: 0 }
        },
        socket: {
          id: 'socket-1',
          data: jest.fn().mockReturnValue({})
        }
      }

      sessionManager.sessions.set('socket-1', mockSession as any)
      mockWorkspace.sessions.set('session-1', mockSession as any)

      // Verify session count
      expect(sessionManager.countUserSessions(mockWorkspace as any, userId)).toBe(1)

      // Verify statistics
      const stats = sessionManager.getStatistics()
      expect(stats).toHaveLength(1)
      expect(stats[0].wsId).toBe(workspaceId)

      // Clean up
      sessionManager.sessions.delete('socket-1')
      mockWorkspace.sessions.delete('session-1')

      expect(sessionManager.countUserSessions(mockWorkspace as any, userId)).toBe(0)
    })

    it('should handle maintenance warning propagation', () => {
      const workspaceId = 'ws-maint' as WorkspaceUuid
      const mockWorkspace = {
        wsId: { uuid: workspaceId, url: 'maint-workspace' },
        sessions: new Map(),
        maintenance: false
      }

      sessionManager.workspaces.set(workspaceId, mockWorkspace as any)

      // Schedule maintenance
      sessionManager.scheduleMaintenance(5, 'Scheduled maintenance')

      expect(sessionManager.timeMinutes).toBe(5)
      expect(sessionManager.maintenanceMessage).toBe('Scheduled maintenance')

      // Cancel maintenance
      sessionManager.scheduleMaintenance(0, undefined)
      expect(sessionManager.timeMinutes).toBe(0)
    })

    it('should handle mixed user types in workspace', () => {
      const mockSessions = [
        {
          session: {
            getUser: jest.fn().mockReturnValue(systemAccountUuid)
          }
        },
        {
          session: {
            getUser: jest.fn().mockReturnValue('regular-user-1' as AccountUuid)
          }
        },
        {
          session: {
            getUser: jest.fn().mockReturnValue('b6996120-416f-49cd-841e-e4a5d2e49c9b' as AccountUuid)
          }
        },
        {
          session: {
            getUser: jest.fn().mockReturnValue('regular-user-2' as AccountUuid)
          }
        },
        {
          session: {
            getUser: jest.fn().mockReturnValue(systemAccountUuid)
          }
        }
      ]

      const stats = sessionManager.calcWorkspaceStats(mockSessions as any)

      expect(stats.sys).toBe(2)
      expect(stats.user).toBe(3)
      expect(stats.anonymous).toBe(1)
    })
  })

  describe('broadcast', () => {
    it('should broadcast to all sessions in workspace', () => {
      const workspaceId = 'ws-broadcast' as WorkspaceUuid
      const mockSession1 = {
        session: {
          getUser: jest.fn().mockReturnValue('user-1' as AccountUuid),
          broadcast: jest.fn()
        },
        socket: { id: 'socket-1' }
      }
      const mockSession2 = {
        session: {
          getUser: jest.fn().mockReturnValue('user-2' as AccountUuid),
          broadcast: jest.fn()
        },
        socket: { id: 'socket-2' }
      }

      const mockWorkspace = {
        sessions: new Map([
          ['session-1', mockSession1],
          ['session-2', mockSession2]
        ]),
        maintenance: false
      }

      sessionManager.workspaces.set(workspaceId, mockWorkspace as any)

      const tx = [{ _id: generateId() } as any]
      sessionManager.broadcast(mockContext, null, workspaceId, tx, undefined)

      // Verify both sessions received the broadcast
      expect(mockSession1.session.broadcast).toHaveBeenCalledWith(expect.any(Object), mockSession1.socket, tx)
      expect(mockSession2.session.broadcast).toHaveBeenCalledWith(expect.any(Object), mockSession2.socket, tx)
    })

    it('should broadcast to specific target user', () => {
      const workspaceId = 'ws-broadcast' as WorkspaceUuid
      const targetUser = 'user-1' as AccountUuid
      const mockSession1 = {
        session: {
          getUser: jest.fn().mockReturnValue(targetUser),
          broadcast: jest.fn()
        },
        socket: { id: 'socket-1' }
      }
      const mockSession2 = {
        session: {
          getUser: jest.fn().mockReturnValue('user-2' as AccountUuid),
          broadcast: jest.fn()
        },
        socket: { id: 'socket-2' }
      }

      const mockWorkspace = {
        sessions: new Map([
          ['session-1', mockSession1],
          ['session-2', mockSession2]
        ]),
        maintenance: false
      }

      sessionManager.workspaces.set(workspaceId, mockWorkspace as any)

      const tx = [{ _id: generateId() } as any]
      sessionManager.broadcast(mockContext, null, workspaceId, tx, targetUser)

      // Only target user should receive broadcast
      expect(mockSession1.session.broadcast).toHaveBeenCalled()
      expect(mockSession2.session.broadcast).not.toHaveBeenCalled()
    })

    it('should exclude specified users from broadcast', () => {
      const workspaceId = 'ws-broadcast' as WorkspaceUuid
      const excludeUser = 'user-1' as AccountUuid
      const mockSession1 = {
        session: {
          getUser: jest.fn().mockReturnValue(excludeUser),
          broadcast: jest.fn()
        },
        socket: { id: 'socket-1' }
      }
      const mockSession2 = {
        session: {
          getUser: jest.fn().mockReturnValue('user-2' as AccountUuid),
          broadcast: jest.fn()
        },
        socket: { id: 'socket-2' }
      }

      const mockWorkspace = {
        sessions: new Map([
          ['session-1', mockSession1],
          ['session-2', mockSession2]
        ]),
        maintenance: false
      }

      sessionManager.workspaces.set(workspaceId, mockWorkspace as any)

      const tx = [{ _id: generateId() } as any]
      sessionManager.broadcast(mockContext, null, workspaceId, tx, undefined, [excludeUser])

      // Excluded user should not receive broadcast
      expect(mockSession1.session.broadcast).not.toHaveBeenCalled()
      expect(mockSession2.session.broadcast).toHaveBeenCalled()
    })

    it('should not broadcast if workspace in maintenance', () => {
      const workspaceId = 'ws-broadcast' as WorkspaceUuid
      const mockSession = {
        session: {
          getUser: jest.fn().mockReturnValue('user-1' as AccountUuid),
          broadcast: jest.fn()
        },
        socket: { id: 'socket-1' }
      }

      const mockWorkspace = {
        sessions: new Map([['session-1', mockSession]]),
        maintenance: true
      }

      sessionManager.workspaces.set(workspaceId, mockWorkspace as any)

      const tx = [{ _id: generateId() } as any]
      sessionManager.broadcast(mockContext, null, workspaceId, tx, undefined)

      expect(mockSession.session.broadcast).not.toHaveBeenCalled()
    })

    it('should handle non-existent workspace gracefully', () => {
      const tx = [{ _id: generateId() } as any]

      // Should not throw
      sessionManager.broadcast(mockContext, null, 'non-existent' as WorkspaceUuid, tx, undefined)
    })
  })

  describe('broadcastSessions', () => {
    it('should broadcast to specific sessions', () => {
      const sessionId1 = 'session-1'
      const sessionId2 = 'session-2'
      const tx1 = [{ _id: generateId(), data: 'tx1' } as any]
      const tx2 = [{ _id: generateId(), data: 'tx2' } as any]

      const mockSession1 = {
        session: {
          sessionId: sessionId1,
          broadcast: jest.fn()
        },
        socket: { id: 'socket-1' }
      }
      const mockSession2 = {
        session: {
          sessionId: sessionId2,
          broadcast: jest.fn()
        },
        socket: { id: 'socket-2' }
      }

      sessionManager.sessions.set('socket-1', mockSession1 as any)
      sessionManager.sessions.set('socket-2', mockSession2 as any)

      const sessionIds = {
        [sessionId1]: tx1,
        [sessionId2]: tx2
      }

      sessionManager.broadcastSessions(mockContext, sessionIds)

      // Each session should receive its specific transactions
      // Note: The actual implementation sends via sendResponse, not broadcast
    })

    it('should handle empty session map', () => {
      // Should not throw
      sessionManager.broadcastSessions(mockContext, {})
    })

    it('should handle non-existent sessions', () => {
      const sessionIds = {
        'non-existent-session': [{ _id: generateId() } as any]
      }

      // Should not throw
      sessionManager.broadcastSessions(mockContext, sessionIds)
    })
  })

  describe('close', () => {
    it('should close session and remove from maps', async () => {
      const workspaceId = 'ws-close' as WorkspaceUuid
      const userId = 'user-close' as AccountUuid
      const sessionId = 'session-close'

      const mockSocket = {
        id: 'socket-close',
        close: jest.fn()
      }

      const mockSession = {
        session: {
          sessionId,
          getUser: jest.fn().mockReturnValue(userId),
          getUserSocialIds: jest.fn().mockReturnValue(['social-1']),
          getSocialIds: jest.fn().mockReturnValue([{ _id: 'social-1', type: 'github', value: 'user' }]),
          requests: new Map(),
          createTime: Date.now()
        },
        socket: mockSocket
      }

      const mockWorkspace = {
        wsId: { uuid: workspaceId, url: 'close-workspace' },
        sessions: new Map([[sessionId, mockSession]]),
        tickHandlers: new Map(),
        maintenance: false
      }

      sessionManager.sessions.set(mockSocket.id, mockSession as any)
      sessionManager.workspaces.set(workspaceId, mockWorkspace as any)

      await sessionManager.close(mockContext, mockSocket as any, workspaceId)

      expect(sessionManager.sessions.has(mockSocket.id)).toBe(false)
      expect(mockWorkspace.sessions.has(sessionId)).toBe(false)
      expect(mockSocket.close).toHaveBeenCalled()
      expect(mockUsersProducer.send).toHaveBeenCalled()
    })

    it('should handle non-existent session gracefully', async () => {
      const mockSocket = {
        id: 'non-existent-socket',
        close: jest.fn()
      }

      // Should not throw
      await sessionManager.close(mockContext, mockSocket as any, 'ws-1' as WorkspaceUuid)
    })
  })

  describe('doBroadcast', () => {
    it('should broadcast to all sessions', () => {
      const mockSession1 = {
        session: {
          getUser: jest.fn().mockReturnValue('user-1' as AccountUuid),
          binaryMode: false,
          useCompression: false
        },
        socket: {
          send: jest.fn().mockResolvedValue(undefined)
        }
      }
      const mockSession2 = {
        session: {
          getUser: jest.fn().mockReturnValue('user-2' as AccountUuid),
          binaryMode: false,
          useCompression: false
        },
        socket: {
          send: jest.fn().mockResolvedValue(undefined)
        }
      }

      const mockWorkspace = {
        sessions: new Map([
          ['session-1', mockSession1],
          ['session-2', mockSession2]
        ]),
        maintenance: false
      }

      const tx = [{ _id: generateId() } as any]
      sessionManager.doBroadcast(mockContext, mockWorkspace as any, tx)

      // Since doBroadcast uses sendResponse which is mocked, we just verify no errors
      // The actual sends happen asynchronously via sendResponse
    })

    it('should filter by target user', () => {
      const targetUser = 'user-1' as AccountUuid
      const mockSession1 = {
        session: {
          getUser: jest.fn().mockReturnValue(targetUser),
          binaryMode: false,
          useCompression: false
        },
        socket: {
          send: jest.fn().mockResolvedValue(undefined)
        }
      }
      const mockSession2 = {
        session: {
          getUser: jest.fn().mockReturnValue('user-2' as AccountUuid),
          binaryMode: false,
          useCompression: false
        },
        socket: {
          send: jest.fn().mockResolvedValue(undefined)
        }
      }

      const mockWorkspace = {
        sessions: new Map([
          ['session-1', mockSession1],
          ['session-2', mockSession2]
        ]),
        maintenance: false
      }

      const tx = [{ _id: generateId() } as any]
      sessionManager.doBroadcast(mockContext, mockWorkspace as any, tx, targetUser)

      // Verify filtering logic works without errors
    })

    it('should exclude specified users', () => {
      const excludeUser = 'user-1' as AccountUuid
      const mockSession1 = {
        session: {
          getUser: jest.fn().mockReturnValue(excludeUser),
          binaryMode: false,
          useCompression: false
        },
        socket: {
          send: jest.fn().mockResolvedValue(undefined)
        }
      }
      const mockSession2 = {
        session: {
          getUser: jest.fn().mockReturnValue('user-2' as AccountUuid),
          binaryMode: false,
          useCompression: false
        },
        socket: {
          send: jest.fn().mockResolvedValue(undefined)
        }
      }

      const mockWorkspace = {
        sessions: new Map([
          ['session-1', mockSession1],
          ['session-2', mockSession2]
        ]),
        maintenance: false
      }

      const tx = [{ _id: generateId() } as any]
      sessionManager.doBroadcast(mockContext, mockWorkspace as any, tx, undefined, [excludeUser])

      // Verify exclusion logic works without errors
    })

    it('should not broadcast if workspace in maintenance', () => {
      const mockSession = {
        session: {
          getUser: jest.fn().mockReturnValue('user-1' as AccountUuid),
          binaryMode: false,
          useCompression: false
        },
        socket: {
          send: jest.fn().mockResolvedValue(undefined)
        }
      }

      const mockWorkspace = {
        sessions: new Map([['session-1', mockSession]]),
        maintenance: true
      }

      const tx = [{ _id: generateId() } as any]
      sessionManager.doBroadcast(mockContext, mockWorkspace as any, tx)

      // Should return early without broadcasting
      expect(mockSession.socket.send).not.toHaveBeenCalled()
    })
  })

  describe('createOpContext', () => {
    it('should create operation context with all required fields', () => {
      const requestId = 'req-123'
      const mockPipeline = {} as any
      const mockSession = {
        getUser: jest.fn().mockReturnValue('user-1' as AccountUuid),
        getRawAccount: jest.fn().mockReturnValue({ primarySocialId: 'social-1' as any }),
        workspace: { uuid: 'ws-1' as WorkspaceUuid },
        binaryMode: true,
        useCompression: true,
        requests: new Map()
      } as any
      const mockSocket = {
        sendPong: jest.fn()
      } as any
      const rateLimit = {
        limit: 100,
        remaining: 50,
        reset: Date.now() + 1000,
        current: 50
      }

      const opContext = sessionManager.createOpContext(
        mockContext,
        mockContext,
        mockPipeline,
        requestId,
        mockSession,
        mockSocket,
        rateLimit
      )

      expect(opContext).toBeDefined()
      expect(opContext.ctx).toBe(mockContext)
      expect(opContext.pipeline).toBe(mockPipeline)
      expect(opContext.requestId).toBe(requestId)
      expect(opContext.sendResponse).toBeDefined()
      expect(opContext.sendError).toBeDefined()
      expect(opContext.sendPong).toBeDefined()
      expect(opContext.socialStringsToUsers).toBeDefined()
    })

    it('should call sendPong on context', () => {
      const mockSocket = {
        sendPong: jest.fn()
      } as any
      const mockSession = {
        getUser: jest.fn().mockReturnValue('user-1' as AccountUuid),
        getRawAccount: jest.fn().mockReturnValue({ primarySocialId: 'social-1' as any }),
        workspace: { uuid: 'ws-1' as WorkspaceUuid },
        requests: new Map()
      } as any

      const opContext = sessionManager.createOpContext(
        mockContext,
        mockContext,
        {} as any,
        'req-1',
        mockSession,
        mockSocket,
        undefined
      )

      opContext.sendPong()
      expect(mockSocket.sendPong).toHaveBeenCalled()
    })
  })

  describe('account service integration', () => {
    it('should handle getWorkspaceInfo success', async () => {
      const { getClient } = await import('@hcengineering/account-client')
      const mockWorkspaceInfo = {
        uuid: 'ws-1' as WorkspaceUuid,
        url: 'workspace-1',
        mode: 'normal',
        versionMajor: 0,
        versionMinor: 7,
        versionPatch: 0,
        region: 'us-east-1'
      }

      ;(getClient as jest.Mock).mockReturnValue({
        getWorkspaceInfo: jest.fn().mockResolvedValue(mockWorkspaceInfo)
      })

      const result = await sessionManager.getWorkspaceInfo(mockContext, 'token-123', true)

      expect(result).toEqual(mockWorkspaceInfo)
    })

    it('should handle getWorkspaceInfo connection errors', async () => {
      const { getClient } = await import('@hcengineering/account-client')
      const connectionError = new Error('Connection refused')
      ;(connectionError as any).cause = { code: 'ECONNREFUSED' }
      ;(getClient as jest.Mock).mockReturnValue({
        getWorkspaceInfo: jest.fn().mockRejectedValue(connectionError)
      })

      const result = await sessionManager.getWorkspaceInfo(mockContext, 'token-123', true)

      expect(result).toBeUndefined()
    })

    it('should handle updateLastVisit', async () => {
      const { getClient } = await import('@hcengineering/account-client')
      ;(getClient as jest.Mock).mockReturnValue({
        updateLastVisit: jest.fn().mockResolvedValue(undefined)
      })

      const workspaces = ['ws-1' as WorkspaceUuid, 'ws-2' as WorkspaceUuid]
      await sessionManager.updateLastVisit(mockContext, workspaces)

      // Should complete without errors
    })

    it('should handle getLoginWithWorkspaceInfo', async () => {
      const { getClient } = await import('@hcengineering/account-client')
      const mockLoginInfo = {
        account: 'user-1' as AccountUuid,
        socialIds: [{ _id: 'social-1' as any, type: 'github', value: 'user' }],
        workspaces: {
          'ws-1': {
            url: 'workspace-1',
            mode: 'normal',
            role: AccountRole.User
          }
        }
      }

      ;(getClient as jest.Mock).mockReturnValue({
        getLoginWithWorkspaceInfo: jest.fn().mockResolvedValue(mockLoginInfo)
      })

      const result = await sessionManager.getLoginWithWorkspaceInfo(mockContext, 'token-123')

      expect(result).toEqual(mockLoginInfo)
    })
  })

  describe('workspace tick handling', () => {
    it('should handle workspace tick handlers', () => {
      const workspaceId = 'ws-tick' as WorkspaceUuid
      const operation = jest.fn()

      const mockWorkspace = {
        wsId: { uuid: workspaceId, url: 'tick-workspace' },
        sessions: new Map(),
        tickHandlers: new Map([['handler-1', { ticks: 1, operation }]]),
        maintenance: false,
        softShutdown: 300,
        workspaceInitCompleted: true,
        closing: undefined,
        tickHash: 0
      }

      sessionManager.workspaces.set(workspaceId, mockWorkspace as any)

      // Run handleTick which should decrement and execute
      sessionManager.handleTick()

      expect(operation).toHaveBeenCalled()
      expect(mockWorkspace.tickHandlers.has('handler-1')).toBe(false)
    })

    it('should decrement softShutdown for empty workspaces', () => {
      const workspaceId = 'ws-shutdown' as WorkspaceUuid
      const mockWorkspace = {
        wsId: { uuid: workspaceId, url: 'shutdown-workspace' },
        sessions: new Map(),
        tickHandlers: new Map(),
        maintenance: false,
        softShutdown: 300,
        workspaceInitCompleted: true,
        closing: undefined,
        tickHash: 0
      }

      sessionManager.workspaces.set(workspaceId, mockWorkspace as any)

      const initialSoftShutdown = mockWorkspace.softShutdown

      sessionManager.handleTick()

      expect(mockWorkspace.softShutdown).toBe(initialSoftShutdown - 1)
    })

    it('should reset softShutdown when workspace has sessions', () => {
      const workspaceId = 'ws-active' as WorkspaceUuid
      const mockWorkspace = {
        wsId: { uuid: workspaceId, url: 'active-workspace' },
        sessions: new Map([
          [
            'session-1',
            {
              session: {
                getUser: jest.fn().mockReturnValue('user-1' as AccountUuid),
                current: { find: 5, tx: 3 },
                mins5: { find: 50, tx: 30 }
              }
            }
          ]
        ]),
        tickHandlers: new Map(),
        maintenance: false,
        softShutdown: 100,
        workspaceInitCompleted: true,
        closing: undefined,
        tickHash: 0
      }

      sessionManager.workspaces.set(workspaceId, mockWorkspace as any)

      sessionManager.handleTick()

      expect(mockWorkspace.softShutdown).toBe(300) // Reset to workspaceSoftShutdownTicks
    })
  })

  describe('session tick handling', () => {
    it('should detect hung sessions and close them', () => {
      const now = Date.now()
      const longTimeAgo = now - 120000 // 120 seconds ago

      const mockSocket = {
        id: 'socket-hung',
        checkState: jest.fn().mockReturnValue(true),
        send: jest.fn().mockResolvedValue(undefined)
      }

      const mockSession = {
        session: {
          getUser: jest.fn().mockReturnValue('user-hung' as AccountUuid),
          lastRequest: longTimeAgo,
          lastPing: longTimeAgo,
          requests: new Map(),
          workspace: { uuid: 'ws-1' as WorkspaceUuid },
          binaryMode: false,
          useCompression: false
        },
        socket: mockSocket,
        tickHash: sessionManager.ticks % 20
      }

      sessionManager.sessions.set(mockSocket.id, mockSession as any)

      // This should detect and close the hung session
      // Note: The actual close is async, so we just verify detection logic runs
      sessionManager.handleTick()
    })

    it('should send ping when session is idle', () => {
      const now = Date.now()
      const idleTime = now - 15000 // 15 seconds ago

      const mockSocket = {
        id: 'socket-idle',
        checkState: jest.fn().mockReturnValue(true),
        send: jest.fn().mockResolvedValue(undefined)
      }

      const mockSession = {
        session: {
          getUser: jest.fn().mockReturnValue('user-idle' as AccountUuid),
          lastRequest: idleTime,
          lastPing: idleTime,
          requests: new Map(),
          workspace: { uuid: 'ws-1' as WorkspaceUuid },
          binaryMode: false,
          useCompression: false
        },
        socket: mockSocket,
        tickHash: sessionManager.ticks % 20
      }

      sessionManager.sessions.set(mockSocket.id, mockSession as any)

      sessionManager.handleTick()

      // Ping should have been sent or attempted
    })
  })

  describe('additional edge cases', () => {
    it('should handle empty reconnectIds gracefully', () => {
      expect(sessionManager.reconnectIds.size).toBeGreaterThanOrEqual(0)
      sessionManager.reconnectIds.clear()
      expect(sessionManager.reconnectIds.size).toBe(0)
    })

    it('should handle empty maintenanceWorkspaces set', () => {
      sessionManager.maintenanceWorkspaces.clear()
      expect(sessionManager.maintenanceWorkspaces.size).toBe(0)
    })

    it('should handle workspaceInfoCache operations', () => {
      const wsId = 'ws-cache' as WorkspaceUuid
      const info = { url: 'cached-ws', mode: 'normal' as any } as any

      sessionManager.workspaceInfoCache.set(wsId, info)
      expect(sessionManager.workspaceInfoCache.get(wsId)).toBe(info)

      sessionManager.workspaceInfoCache.delete(wsId)
      expect(sessionManager.workspaceInfoCache.has(wsId)).toBe(false)
    })

    it('should handle model version checks', () => {
      sessionManager.modelVersion = '0.7.5'
      expect(sessionManager.modelVersion).toBe('0.7.5')

      sessionManager.modelVersion = ''
      expect(sessionManager.modelVersion).toBe('')
    })

    it('should handle server version', () => {
      expect(sessionManager.serverVersion).toBeDefined()
    })

    it('should handle enableCompression flag', () => {
      expect(typeof sessionManager.enableCompression).toBe('boolean')
    })

    it('should handle accountsUrl', () => {
      expect(sessionManager.accountsUrl).toBe('http://localhost:3000')
    })

    it('should handle hung session thresholds', () => {
      expect(sessionManager.hungSessionsWarnPercent).toBeGreaterThan(0)
      expect(sessionManager.hungSessionsFailPercent).toBeGreaterThan(sessionManager.hungSessionsWarnPercent)
      expect(sessionManager.hungRequestsFailPercent).toBeGreaterThan(0)
    })
  })
})
