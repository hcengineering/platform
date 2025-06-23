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

import { AccountRole, type MeasureContext, type PersonUuid, type WorkspaceUuid } from '@hcengineering/core'
import platform, { PlatformError, Status, Severity, getMetadata } from '@hcengineering/platform'
import { decodeTokenVerbose } from '@hcengineering/server-token'

import { type AccountDB } from '../types'
import { createInvite, createInviteLink, sendInvite, resendInvite, getLoginInfoByToken } from '../operations'
import { accountPlugin } from '../plugin'

// Mock platform
jest.mock('@hcengineering/platform', () => {
  const actual = jest.requireActual('@hcengineering/platform')
  return {
    ...actual,
    ...actual.default,
    getMetadata: jest.fn(),
    translate: jest.fn((id, params) => `${id} << ${JSON.stringify(params)}`)
  }
})

// Mock server-token
jest.mock('@hcengineering/server-token', () => ({
  decodeTokenVerbose: jest.fn(),
  generateToken: jest.fn()
}))

describe('invite operations', () => {
  const mockCtx = {
    error: jest.fn(),
    info: jest.fn()
  } as unknown as MeasureContext

  const mockBranding = null

  const mockDb = {
    account: {
      findOne: jest.fn()
    },
    workspace: {
      findOne: jest.fn()
    },
    invite: {
      insertOne: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn()
    },
    getWorkspaceRole: jest.fn(),
    person: {
      findOne: jest.fn()
    }
  } as unknown as AccountDB

  const mockToken = 'test-token'
  const mockAccount = { uuid: 'account-uuid' as PersonUuid }
  const mockWorkspace = {
    uuid: 'workspace-uuid' as WorkspaceUuid,
    name: 'Test Workspace',
    url: 'test-workspace'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
      account: mockAccount.uuid,
      workspace: mockWorkspace.uuid,
      extra: {}
    })
  })

  describe('createInvite', () => {
    test('should create invite for authorized maintainer', async () => {
      const inviteId = 'new-invite-id'
      const beforeTest = Date.now()
      const expectedExpiration = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Maintainer)
      ;(mockDb.invite.insertOne as jest.Mock).mockResolvedValue(inviteId)

      const result = await createInvite(mockCtx, mockDb, mockBranding, mockToken, {
        exp: expectedExpiration,
        email: 'test@example.com',
        limit: 1,
        role: AccountRole.User
      })

      const afterTest = Date.now()
      expect(result).toBe(inviteId)

      expect(mockDb.invite.insertOne).toHaveBeenCalledWith({
        workspaceUuid: mockWorkspace.uuid,
        expiresOn: expect.any(Number),
        email: 'test@example.com',
        remainingUses: 1,
        role: AccountRole.User,
        autoJoin: undefined
      })

      // Get the actual expiresOn value from the call
      const actualCall = (mockDb.invite.insertOne as jest.Mock).mock.calls[0][0]
      expect(actualCall.expiresOn).toBeGreaterThanOrEqual(beforeTest + expectedExpiration)
      expect(actualCall.expiresOn).toBeLessThanOrEqual(afterTest + expectedExpiration)
    })

    test('should throw error if caller role is insufficient', async () => {
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.User)

      await expect(
        createInvite(mockCtx, mockDb, mockBranding, mockToken, {
          exp: 24 * 60 * 60 * 1000,
          email: 'test@example.com',
          limit: 1,
          role: AccountRole.Owner
        })
      ).rejects.toThrow(new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {})))
    })
  })

  describe('createInviteLink', () => {
    const frontUrl = 'https://app.example.com'

    beforeEach(() => {
      ;(getMetadata as jest.Mock).mockImplementation((key) => {
        if (key === accountPlugin.metadata.FrontURL) return frontUrl
        return undefined
      })
    })

    test('should create basic invite link', async () => {
      const inviteId = 'new-invite-id'
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Maintainer)
      ;(mockDb.invite.insertOne as jest.Mock).mockResolvedValue(inviteId)

      const result = await createInviteLink(mockCtx, mockDb, mockBranding, mockToken, {
        email: 'test@example.com',
        role: AccountRole.User
      })

      expect(result).toBe(`${frontUrl}/login/join?inviteId=${inviteId}`)
    })

    test('should create link with auto-join parameters', async () => {
      const inviteId = 'new-invite-id'
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Maintainer)
      ;(mockDb.invite.insertOne as jest.Mock).mockResolvedValue(inviteId)
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: mockAccount.uuid,
        workspace: mockWorkspace.uuid,
        extra: { service: 'schedule' }
      })

      const result = await createInviteLink(mockCtx, mockDb, mockBranding, mockToken, {
        email: 'test@example.com',
        role: AccountRole.User,
        autoJoin: true,
        firstName: 'John',
        lastName: 'Doe'
      })

      expect(result).toBe(`${frontUrl}/login/join?inviteId=${inviteId}&autoJoin&firstName=John&lastName=Doe`)
    })

    test('should create link with redirect parameter', async () => {
      const inviteId = 'new-invite-id'
      const navigateUrl = '/workspace/calendar'
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Maintainer)
      ;(mockDb.invite.insertOne as jest.Mock).mockResolvedValue(inviteId)

      const result = await createInviteLink(mockCtx, mockDb, mockBranding, mockToken, {
        email: 'test@example.com',
        role: AccountRole.User,
        navigateUrl
      })

      expect(result).toBe(`${frontUrl}/login/join?inviteId=${inviteId}&navigateUrl=${encodeURIComponent(navigateUrl)}`)
    })

    test('should create link with all parameters', async () => {
      const inviteId = 'new-invite-id'
      const navigateUrl = '/workspace/settings?tab=members'
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Maintainer)
      ;(mockDb.invite.insertOne as jest.Mock).mockResolvedValue(inviteId)
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: mockAccount.uuid,
        workspace: mockWorkspace.uuid,
        extra: { service: 'schedule' }
      })

      const result = await createInviteLink(mockCtx, mockDb, mockBranding, mockToken, {
        email: 'test@example.com',
        role: AccountRole.User,
        autoJoin: true,
        firstName: 'John',
        lastName: 'Doe',
        navigateUrl
      })

      expect(result).toBe(
        `${frontUrl}/login/join?inviteId=${inviteId}&autoJoin&firstName=John&lastName=Doe&navigateUrl=${encodeURIComponent(navigateUrl)}`
      )
    })

    // Negative scenarios
    test('should throw error for auto-join without firstName', async () => {
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Maintainer)
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: mockAccount.uuid,
        workspace: mockWorkspace.uuid,
        extra: { service: 'schedule' }
      })

      await expect(
        createInviteLink(mockCtx, mockDb, mockBranding, mockToken, {
          email: 'test@example.com',
          role: AccountRole.User,
          autoJoin: true
        })
      ).rejects.toThrow(new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {})))
    })

    test('should throw error for auto-join without schedule service', async () => {
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Maintainer)
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: mockAccount.uuid,
        workspace: mockWorkspace.uuid,
        extra: { service: 'other' }
      })

      await expect(
        createInviteLink(mockCtx, mockDb, mockBranding, mockToken, {
          email: 'test@example.com',
          role: AccountRole.User,
          autoJoin: true,
          firstName: 'John'
        })
      ).rejects.toThrow(new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {})))
    })

    test('should throw error for insufficient role', async () => {
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Guest)

      await expect(
        createInviteLink(mockCtx, mockDb, mockBranding, mockToken, {
          email: 'test@example.com',
          role: AccountRole.User
        })
      ).rejects.toThrow(new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {})))
    })
  })

  describe('sendInvite', () => {
    const mockEmail = 'test@example.com'
    const sesUrl = 'https://ses.example.com'
    const sesAuth = 'test-auth-token'

    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true })
      ;(getMetadata as jest.Mock).mockImplementation((key) => {
        switch (key) {
          case accountPlugin.metadata.MAIL_URL:
            return sesUrl
          case accountPlugin.metadata.MAIL_AUTH_TOKEN:
            return sesAuth
          case accountPlugin.metadata.FrontURL:
            return 'https://app.example.com'
          default:
            return undefined
        }
      })
    })

    test('should send invite email with correct parameters', async () => {
      const inviteId = 'new-invite-id'
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Maintainer)
      ;(mockDb.invite.insertOne as jest.Mock).mockResolvedValue(inviteId)

      await sendInvite(mockCtx, mockDb, mockBranding, mockToken, {
        email: mockEmail,
        role: AccountRole.User,
        expHours: 48
      })

      expect(global.fetch).toHaveBeenCalledWith(`${sesUrl}/send`, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sesAuth}`
        },
        body: expect.stringContaining(mockEmail)
      })

      // Verify invite was created with correct parameters
      expect(mockDb.invite.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockEmail,
          remainingUses: 1,
          role: AccountRole.User,
          expiresOn: expect.any(Number)
        })
      )
    })

    test('should throw error if caller has insufficient role', async () => {
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Guest)

      await expect(
        sendInvite(mockCtx, mockDb, mockBranding, mockToken, {
          email: mockEmail,
          role: AccountRole.User
        })
      ).rejects.toThrow(new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {})))

      expect(global.fetch).not.toHaveBeenCalled()
    })

    test('should throw error if workspace not found', async () => {
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(null)

      await expect(
        sendInvite(mockCtx, mockDb, mockBranding, mockToken, {
          email: mockEmail,
          role: AccountRole.User
        })
      ).rejects.toThrow(
        new PlatformError(
          new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid: mockWorkspace.uuid })
        )
      )

      expect(global.fetch).not.toHaveBeenCalled()
    })

    test('should throw error if account not found', async () => {
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(null)

      await expect(
        sendInvite(mockCtx, mockDb, mockBranding, mockToken, {
          email: mockEmail,
          role: AccountRole.User
        })
      ).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: mockAccount.uuid }))
      )

      expect(global.fetch).not.toHaveBeenCalled()
    })

    test('should use custom expiration hours', async () => {
      const inviteId = 'new-invite-id'
      const customExpHours = 72
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Maintainer)
      ;(mockDb.invite.insertOne as jest.Mock).mockResolvedValue(inviteId)

      const beforeTest = Date.now()
      await sendInvite(mockCtx, mockDb, mockBranding, mockToken, {
        email: mockEmail,
        role: AccountRole.User,
        expHours: customExpHours
      })
      const afterTest = Date.now()

      const actualCall = (mockDb.invite.insertOne as jest.Mock).mock.calls[0][0]
      const expectedExpiration = customExpHours * 60 * 60 * 1000

      // Check if expiration time is within the expected range
      const minExpected = beforeTest + expectedExpiration
      const maxExpected = afterTest + expectedExpiration

      expect(actualCall.expiresOn).toBeGreaterThanOrEqual(minExpected - 1) // Allow 1ms tolerance
      expect(actualCall.expiresOn).toBeLessThanOrEqual(maxExpected)
    })
  })

  describe('resendInvite', () => {
    const mockEmail = 'test@example.com'

    test('should resend existing invite', async () => {
      const existingInvite = {
        id: 'existing-invite-id',
        workspaceUuid: mockWorkspace.uuid,
        email: mockEmail
      }
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Maintainer)
      ;(mockDb.invite.findOne as jest.Mock).mockResolvedValue(existingInvite)
      global.fetch = jest.fn().mockResolvedValue({ ok: true })

      await resendInvite(mockCtx, mockDb, mockBranding, mockToken, { email: mockEmail, role: AccountRole.User })

      expect(mockDb.invite.update).toHaveBeenCalledWith(
        { id: existingInvite.id },
        expect.objectContaining({
          expiresOn: expect.any(Number),
          remainingUses: 1,
          role: AccountRole.User
        })
      )
      expect(global.fetch).toHaveBeenCalled()
    })

    test('should create new invite if none exists', async () => {
      const newInviteId = 'new-invite-id'
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Maintainer)
      ;(mockDb.invite.findOne as jest.Mock).mockResolvedValue(null)
      ;(mockDb.invite.insertOne as jest.Mock).mockResolvedValue(newInviteId)
      global.fetch = jest.fn().mockResolvedValue({ ok: true })

      await resendInvite(mockCtx, mockDb, mockBranding, mockToken, { email: mockEmail, role: AccountRole.User })

      expect(mockDb.invite.insertOne).toHaveBeenCalled()
      expect(global.fetch).toHaveBeenCalled()
    })
  })

  describe('getLoginInfoByToken', () => {
    const mockCtx = {
      error: jest.fn(),
      info: jest.fn()
    } as unknown as MeasureContext

    const mockBranding = null
    const mockToken = 'test-token'
    const mockPersonId = 'test-person-id'

    const mockDb = {
      account: {
        findOne: jest.fn()
      },
      workspace: {
        findOne: jest.fn()
      },
      person: {
        findOne: jest.fn()
      },
      socialId: {
        find: jest.fn()
      },
      getWorkspaceRole: jest.fn()
    } as unknown as AccountDB

    beforeEach(() => {
      jest.clearAllMocks()
      // Mock the metadata for endpoints
      ;(getMetadata as jest.Mock).mockImplementation((key) => {
        if (key === accountPlugin.metadata.Transactors) {
          return 'ws://external:3000;ws://external:3000;eu,ws://internal:3000;ws://internal:3000;us'
        }
        return undefined
      })
    })

    describe('endpoint selection', () => {
      const mockWorkspaceEu = {
        uuid: 'workspace-uuid' as WorkspaceUuid,
        name: 'Test Workspace',
        url: 'test-workspace',
        region: 'eu'
      }

      const mockPerson = {
        uuid: mockPersonId as PersonUuid,
        firstName: 'John',
        lastName: 'Doe'
      }

      beforeEach(() => {
        ;(mockDb.person.findOne as jest.Mock).mockResolvedValue(mockPerson)
        ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.User)
        ;(mockDb.socialId.find as jest.Mock).mockResolvedValue([{ _id: 'social-id-1' }])
        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: mockPersonId,
          workspace: mockWorkspaceEu.uuid,
          extra: {}
        })
      })

      test('should return login info with external endpoint when clientNetworkPosition is external', async () => {
        ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspaceEu)

        const result = await getLoginInfoByToken(
          mockCtx,
          mockDb,
          mockBranding,
          mockToken,
          {},
          {
            clientNetworkPosition: 'external'
          }
        )

        expect(result).toEqual({
          account: mockPersonId,
          name: 'John Doe',
          socialId: 'social-id-1',
          token: mockToken,
          workspace: mockWorkspaceEu.uuid,
          endpoint: 'ws://external:3000',
          role: AccountRole.User
        })
      })

      test('should return login info with internal endpoint when clientNetworkPosition is internal', async () => {
        const mockWorkspaceUs = {
          ...mockWorkspaceEu,
          region: 'us'
        }
        ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspaceUs)

        const result = await getLoginInfoByToken(
          mockCtx,
          mockDb,
          mockBranding,
          mockToken,
          {},
          {
            clientNetworkPosition: 'internal'
          }
        )

        expect(result).toEqual({
          account: mockPersonId,
          name: 'John Doe',
          socialId: 'social-id-1',
          token: mockToken,
          workspace: mockWorkspaceUs.uuid,
          endpoint: 'ws://internal:3000',
          role: AccountRole.User
        })
      })

      test('should default to external endpoint when clientNetworkPosition is not provided', async () => {
        ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspaceEu)

        const result = await getLoginInfoByToken(mockCtx, mockDb, mockBranding, mockToken, {})

        expect(result).toEqual({
          account: mockPersonId,
          name: 'John Doe',
          socialId: 'social-id-1',
          token: mockToken,
          workspace: mockWorkspaceEu.uuid,
          endpoint: 'ws://external:3000',
          role: AccountRole.User
        })
      })
    })

    test('should return login info without workspace when no workspace in token', async () => {
      const mockPerson = {
        uuid: mockPersonId as PersonUuid,
        firstName: 'John',
        lastName: 'Doe'
      }

      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: mockPersonId,
        workspace: undefined,
        extra: {}
      })
      ;(mockDb.person.findOne as jest.Mock).mockResolvedValue(mockPerson)
      ;(mockDb.socialId.find as jest.Mock).mockResolvedValue([{ _id: 'social-id-1' }])

      const result = await getLoginInfoByToken(mockCtx, mockDb, mockBranding, mockToken, {})

      expect(result).toEqual({
        account: mockPersonId,
        name: 'John Doe',
        socialId: 'social-id-1',
        token: mockToken
      })
    })

    test('should throw error when workspace not found', async () => {
      const mockWorkspace = {
        uuid: 'workspace-uuid' as WorkspaceUuid
      }

      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: mockPersonId,
        workspace: mockWorkspace.uuid,
        extra: {}
      })
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(null)
      ;(mockDb.person.findOne as jest.Mock).mockResolvedValue({
        uuid: mockPersonId,
        firstName: 'John',
        lastName: 'Doe'
      })
      ;(mockDb.socialId.find as jest.Mock).mockResolvedValue([{ _id: 'social-id-1' }])

      await expect(getLoginInfoByToken(mockCtx, mockDb, mockBranding, mockToken, {})).rejects.toThrow(
        new PlatformError(
          new Status(Severity.ERROR, platform.status.WorkspaceNotFound, { workspaceUuid: mockWorkspace.uuid })
        )
      )
    })
  })
})
