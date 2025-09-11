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
  readOnlyGuestAccountUuid,
  AccountRole,
  type PersonId,
  SocialIdType,
  type MeasureContext,
  type PersonUuid,
  type WorkspaceUuid,
  type AccountUuid,
  systemAccountUuid
} from '@hcengineering/core'
import platform, { PlatformError, Status, Severity, getMetadata } from '@hcengineering/platform'
import { decodeToken, decodeTokenVerbose } from '@hcengineering/server-token'

import * as utils from '../utils'
import { type AccountDB, type SocialId } from '../types'
import {
  createInvite,
  createInviteLink,
  sendInvite,
  resendInvite,
  getLoginInfoByToken,
  releaseSocialId,
  loginAsGuest,
  loginOtp,
  login,
  confirm,
  signUp,
  validateOtp,
  signUpOtp,
  restorePassword,
  requestPasswordReset,
  changePassword,
  getPerson,
  getSocialIds,
  createAccessLink
} from '../operations'
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
  decodeToken: jest.fn(),
  generateToken: jest.fn().mockImplementation((account, workspace, extra, _, options) => {
    let token = `mocked-token-${account}`
    if (workspace != null) {
      token += `-${workspace}`
    }
    if (options != null) {
      token += `-${JSON.stringify(options)}`
    }
    if (extra != null) {
      token += `-${JSON.stringify(extra)}`
    }
    return token
  })
}))

describe('account operations', () => {
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
    },
    generatePersonUuid: jest.fn().mockResolvedValue('generated-person-uuid' as PersonUuid)
  } as unknown as AccountDB

  const mockToken = 'test-token'
  const mockAccount = { uuid: 'account-uuid' as PersonUuid }
  const mockWorkspace = {
    uuid: 'workspace-uuid' as WorkspaceUuid,
    name: 'Test Workspace',
    url: 'test-workspace',
    region: 'us'
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
        findOne: jest.fn(),
        insertOne: jest.fn()
      },
      accountEvent: {
        insertOne: jest.fn()
      },
      workspace: {
        findOne: jest.fn()
      },
      person: {
        findOne: jest.fn()
      },
      socialId: {
        findOne: jest.fn(),
        find: jest.fn(),
        insertOne: jest.fn(),
        update: jest.fn()
      },
      getWorkspaceRole: jest.fn(),
      assignWorkspace: jest.fn(),
      updateWorkspaceRole: jest.fn(),
      generatePersonUuid: jest.fn()
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
          token: 'mocked-token-test-person-id-workspace-uuid-{}-{}',
          workspace: mockWorkspaceEu.uuid,
          workspaceUrl: 'test-workspace',
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
          token: 'mocked-token-test-person-id-workspace-uuid-{}-{}',
          workspace: mockWorkspaceUs.uuid,
          workspaceUrl: 'test-workspace',
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
          token: 'mocked-token-test-person-id-workspace-uuid-{}-{}',
          workspace: mockWorkspaceEu.uuid,
          workspaceUrl: 'test-workspace',
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
        token: 'mocked-token-test-person-id-{}-{}'
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

    test('should use sub claim as account when provided', async () => {
      const subAccount = 'sub-account-uuid' as AccountUuid
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: mockAccount.uuid,
        workspace: mockWorkspace.uuid,
        extra: {},
        sub: subAccount
      })
      ;(mockDb.person.findOne as jest.Mock).mockResolvedValue({
        uuid: subAccount,
        firstName: 'Sub',
        lastName: 'User'
      })
      ;(mockDb.socialId.find as jest.Mock).mockResolvedValue([{ _id: 'social-id-1' }])
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.User)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)

      const result = await getLoginInfoByToken(mockCtx, mockDb, mockBranding, mockToken)

      expect(result).toEqual({
        account: subAccount, // Should use sub instead of account
        name: 'Sub User',
        socialId: 'social-id-1',
        token: expect.stringContaining(`"sub":"${subAccount}"`),
        workspace: mockWorkspace.uuid,
        workspaceUrl: mockWorkspace.url,
        endpoint: expect.any(String),
        role: AccountRole.User
      })
    })

    describe('with grants', () => {
      const grantWorkspace = {
        uuid: 'grant-workspace-uuid' as WorkspaceUuid,
        name: 'Grant Workspace',
        url: 'grant-workspace-url',
        region: 'us'
      }

      const grantRole = AccountRole.User
      const grantAccount = 'grant-account' as AccountUuid
      const grantFirstName = 'Grant'
      const grantLastName = 'User'
      const mockTokenObj = {
        account: grantAccount,
        workspace: undefined,
        extra: {},
        grant: {
          workspace: grantWorkspace.uuid,
          role: grantRole,
          firstName: grantFirstName,
          lastName: grantLastName
        }
      }

      beforeEach(() => {
        jest.clearAllMocks()
        ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(grantWorkspace)
        ;(decodeTokenVerbose as jest.Mock).mockReturnValue(mockTokenObj)
      })

      test('should create automatic account when grant for new account', async () => {
        // Mock account doesn't exist yet
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(null)
        ;(mockDb.person.findOne as jest.Mock).mockResolvedValue({
          uuid: grantAccount,
          firstName: grantFirstName,
          lastName: grantLastName
        })

        const result = await getLoginInfoByToken(mockCtx, mockDb, mockBranding, mockToken)

        expect(mockDb.assignWorkspace).toHaveBeenCalledWith(grantAccount, grantWorkspace.uuid, grantRole)
        expect(result).toEqual({
          account: grantAccount,
          name: `${grantFirstName} ${grantLastName}`,
          token: expect.stringContaining(grantAccount),
          workspace: grantWorkspace.uuid,
          workspaceUrl: grantWorkspace.url,
          endpoint: expect.any(String),
          socialId: 'social-id-1',
          role: grantRole
        })
      })

      test('should request firstName/lastName if not provided for new account', async () => {
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(null)
        ;(mockDb.person.findOne as jest.Mock).mockResolvedValue(null)
        delete (mockTokenObj.grant as any).firstName

        const result = await getLoginInfoByToken(mockCtx, mockDb, mockBranding, mockToken)

        expect(result).toEqual({
          request: true,
          lastName: grantLastName
        })
      })

      test('should use existing automatic account with grant', async () => {
        const existingAutomaticAccount = {
          uuid: grantAccount,
          automatic: true
        }
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(existingAutomaticAccount)
        ;(mockDb.person.findOne as jest.Mock).mockResolvedValue({
          uuid: grantAccount,
          firstName: grantFirstName,
          lastName: grantLastName
        })
        ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Guest)

        const result = await getLoginInfoByToken(mockCtx, mockDb, mockBranding, mockToken)

        expect(mockDb.updateWorkspaceRole).toHaveBeenCalledWith(grantAccount, grantWorkspace.uuid, grantRole)
        expect(result).toEqual({
          account: grantAccount,
          name: `${grantFirstName} ${grantLastName}`,
          token: expect.stringContaining(grantAccount),
          socialId: 'social-id-1',
          workspace: grantWorkspace.uuid,
          workspaceUrl: grantWorkspace.url,
          endpoint: expect.any(String),
          role: AccountRole.Guest
        })
      })

      test('should return null for grant with existing non-automatic account', async () => {
        const existingAccount = {
          uuid: grantAccount,
          automatic: false
        }
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(existingAccount)

        const result = await getLoginInfoByToken(mockCtx, mockDb, mockBranding, mockToken)

        expect(result).toBeNull()
        expect(mockDb.assignWorkspace).not.toHaveBeenCalled()
      })

      test('should generate UUID and use as sub when grant present without sub', async () => {
        const generatedUuid = 'generated-uuid' as AccountUuid
        const grant = {
          workspace: mockWorkspace.uuid,
          role: AccountRole.User,
          firstName: 'John',
          lastName: 'Doe'
        }

        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: utils.GUEST_ACCOUNT,
          extra: {},
          grant
        })
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(null)
        ;(mockDb.generatePersonUuid as jest.Mock).mockResolvedValue(generatedUuid)
        ;(mockDb.person.findOne as jest.Mock).mockResolvedValue({
          uuid: generatedUuid,
          firstName: 'John',
          lastName: 'Doe'
        })
        ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
        ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.User)

        const result = await getLoginInfoByToken(mockCtx, mockDb, mockBranding, mockToken)

        expect(mockDb.generatePersonUuid).toHaveBeenCalled()
        expect(result).toEqual({
          account: generatedUuid,
          name: 'John Doe',
          socialId: 'social-id-1',
          token: expect.stringContaining(`"sub":"${generatedUuid}"`),
          workspace: mockWorkspace.uuid,
          workspaceUrl: mockWorkspace.url,
          endpoint: expect.any(String),
          role: AccountRole.User
        })
      })

      test('should use existing sub', async () => {
        const existingUuid = 'existing-uuid' as AccountUuid
        const grant = {
          workspace: mockWorkspace.uuid,
          role: AccountRole.User,
          firstName: 'John',
          lastName: 'Doe'
        }

        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: utils.GUEST_ACCOUNT,
          extra: {},
          grant,
          sub: existingUuid
        })
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(null)
        ;(mockDb.person.findOne as jest.Mock).mockResolvedValue({
          uuid: existingUuid,
          firstName: 'John',
          lastName: 'Doe'
        })
        ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
        ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.User)

        const result = await getLoginInfoByToken(mockCtx, mockDb, mockBranding, mockToken)

        expect(mockDb.generatePersonUuid).not.toHaveBeenCalled()
        expect(result).toEqual({
          account: existingUuid,
          name: 'John Doe',
          socialId: 'social-id-1',
          token: expect.stringContaining(`"sub":"${existingUuid}"`),
          workspace: mockWorkspace.uuid,
          workspaceUrl: mockWorkspace.url,
          endpoint: expect.any(String),
          role: AccountRole.User
        })
      })

      test('should throw error for grant with system account', async () => {
        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: utils.GUEST_ACCOUNT,
          extra: {},
          grant: { workspace: grantWorkspace.uuid, role: grantRole },
          sub: systemAccountUuid
        })
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(null)

        await expect(getLoginInfoByToken(mockCtx, mockDb, mockBranding, mockToken)).rejects.toThrow(
          new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
        )
      })

      test('should throw error for grant with admin account', async () => {
        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: grantAccount,
          extra: { admin: 'true' },
          grant: { workspace: grantWorkspace.uuid, role: grantRole }
        })

        await expect(getLoginInfoByToken(mockCtx, mockDb, mockBranding, mockToken)).rejects.toThrow(
          new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
        )
      })

      test('should throw error for grant in workspace-specific token', async () => {
        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: grantAccount,
          workspace: 'some-workspace-uuid',
          grant: { workspace: grantWorkspace.uuid, role: grantRole }
        })

        await expect(getLoginInfoByToken(mockCtx, mockDb, mockBranding, mockToken)).rejects.toThrow(
          new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
        )
      })
    })

    test('should handle token with nbf and exp claims', async () => {
      const notBefore = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      const expiration = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now

      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        account: mockAccount.uuid,
        workspace: mockWorkspace.uuid,
        extra: {},
        nbf: notBefore,
        exp: expiration
      })
      ;(mockDb.person.findOne as jest.Mock).mockResolvedValue({
        uuid: mockAccount.uuid,
        firstName: 'John',
        lastName: 'Doe'
      })
      ;(mockDb.socialId.find as jest.Mock).mockResolvedValue([{ _id: 'social-id-1' }])
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.User)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)

      const result = await getLoginInfoByToken(mockCtx, mockDb, mockBranding, mockToken)

      expect(result).toEqual({
        account: mockAccount.uuid,
        name: 'John Doe',
        socialId: 'social-id-1',
        token: expect.stringContaining(`"nbf":${notBefore},"exp":${expiration}`),
        workspace: mockWorkspace.uuid,
        workspaceUrl: mockWorkspace.url,
        endpoint: expect.any(String),
        role: AccountRole.User
      })
    })

    test('should throw error when token is not yet active', async () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600 // 1 hour in the future

      ;(decodeToken as jest.Mock).mockReturnValue({ nbf: futureTime })
      ;(decodeTokenVerbose as jest.Mock).mockImplementation(() => {
        throw new Error('Token not yet active')
      })

      await expect(getLoginInfoByToken(mockCtx, mockDb, mockBranding, mockToken)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.TokenNotActive, { notBefore: futureTime }))
      )
    })

    test('should throw error when token has expired', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockImplementation(() => {
        throw new Error('Token expired')
      })

      await expect(getLoginInfoByToken(mockCtx, mockDb, mockBranding, mockToken)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.TokenExpired, {}))
      )
    })
  })

  describe('releaseSocialId', () => {
    const mockCtx = {
      error: jest.fn()
    } as unknown as MeasureContext

    const mockDb = {} as unknown as AccountDB
    const mockBranding = null
    const mockToken = 'test-token'

    const mockReleasedSocialId = {
      _id: 'released-id' as PersonId,
      type: SocialIdType.GITHUB,
      value: 'test-value#released-id',
      personUuid: 'test-person' as PersonUuid,
      isDeleted: true,
      key: 'github:test-value#released-id'
    }

    // Create spy on doReleaseSocialId
    const doReleaseSocialIdSpy = jest
      .spyOn(utils, 'doReleaseSocialId')
      .mockImplementation(async () => mockReleasedSocialId)

    beforeEach(() => {
      jest.clearAllMocks()
    })

    afterAll(() => {
      doReleaseSocialIdSpy.mockRestore()
    })

    test('should allow github service to release social id', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })

      const params = {
        personUuid: 'test-person' as PersonUuid,
        type: SocialIdType.GITHUB,
        value: 'test-value'
      }

      const result = await releaseSocialId(mockCtx, mockDb, mockBranding, mockToken, params)

      expect(doReleaseSocialIdSpy).toHaveBeenCalledWith(
        mockDb,
        params.personUuid,
        params.type,
        params.value,
        'github',
        undefined
      )
      expect(result).toBe(mockReleasedSocialId)
    })

    test('should throw error for unauthorized service', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'unauthorized' }
      })

      const params = {
        personUuid: 'test-person' as PersonUuid,
        type: SocialIdType.GITHUB,
        value: 'test-value'
      }

      await expect(releaseSocialId(mockCtx, mockDb, mockBranding, mockToken, params)).rejects.toThrow(
        new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
      )

      expect(doReleaseSocialIdSpy).not.toHaveBeenCalled()
    })

    test('should throw error for invalid parameters', async () => {
      ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
        extra: { service: 'github' }
      })

      const invalidParams = [
        { type: SocialIdType.GITHUB, value: 'test' }, // missing personUuid
        { personUuid: 'test' as PersonUuid, value: 'test' }, // missing type
        { personUuid: 'test' as PersonUuid, type: SocialIdType.GITHUB }, // missing value
        { personUuid: 'test' as PersonUuid, type: 'invalid' as SocialIdType, value: 'test' } // invalid type
      ]

      for (const params of invalidParams) {
        await expect(releaseSocialId(mockCtx, mockDb, mockBranding, mockToken, params as any)).rejects.toThrow(
          new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
        )
      }

      expect(doReleaseSocialIdSpy).not.toHaveBeenCalled()
    })
  })

  describe('createAccessLink', () => {
    const frontUrl = 'https://app.example.com'

    beforeEach(() => {
      ;(getMetadata as jest.Mock).mockImplementation((key) => {
        if (key === accountPlugin.metadata.FrontURL) return frontUrl
        return undefined
      })
      // Reset the mock for each test
      ;(mockDb.generatePersonUuid as jest.Mock).mockResolvedValue('generated-person-uuid' as PersonUuid)
    })

    test('should create basic access link', async () => {
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Maintainer)

      const result = await createAccessLink(mockCtx, mockDb, mockBranding, mockToken, {
        role: AccountRole.User
      })

      expect(mockDb.generatePersonUuid).toHaveBeenCalled()
      expect(result).toBe(
        `${frontUrl}/login/auth?token=mocked-token-b6996120-416f-49cd-841e-e4a5d2e49c9b-${JSON.stringify({
          grant: {
            workspace: 'workspace-uuid',
            role: 'USER',
            grantedBy: 'account-uuid'
          },
          sub: 'generated-person-uuid'
        })}`
      )
    })

    test('should create link with person info', async () => {
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Maintainer)

      const result = await createAccessLink(mockCtx, mockDb, mockBranding, mockToken, {
        role: AccountRole.User,
        firstName: 'John',
        lastName: 'Doe'
      })

      expect(mockDb.generatePersonUuid).toHaveBeenCalled()
      expect(result).toBe(
        `${frontUrl}/login/auth?token=mocked-token-b6996120-416f-49cd-841e-e4a5d2e49c9b-${JSON.stringify({
          grant: {
            workspace: mockWorkspace.uuid,
            role: AccountRole.User,
            grantedBy: 'account-uuid',
            firstName: 'John',
            lastName: 'Doe'
          },
          sub: 'generated-person-uuid'
        })}`
      )
    })

    test('should create link with extra parameters', async () => {
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Maintainer)

      const extraParams = JSON.stringify({ param1: 'value1', param2: 'value2' })
      const result = await createAccessLink(mockCtx, mockDb, mockBranding, mockToken, {
        role: AccountRole.User,
        extra: extraParams
      })

      expect(mockDb.generatePersonUuid).toHaveBeenCalled()
      expect(result).toBe(
        `${frontUrl}/login/auth?token=mocked-token-b6996120-416f-49cd-841e-e4a5d2e49c9b-${JSON.stringify({
          grant: {
            workspace: mockWorkspace.uuid,
            role: AccountRole.User,
            grantedBy: 'account-uuid',
            extra: { param1: 'value1', param2: 'value2' }
          },
          sub: 'generated-person-uuid'
        })}`
      )
    })

    test('should create link with navigation URL', async () => {
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Maintainer)

      const navigateUrl = '/workspace/calendar'
      const result = await createAccessLink(mockCtx, mockDb, mockBranding, mockToken, {
        role: AccountRole.User,
        navigateUrl
      })

      expect(mockDb.generatePersonUuid).toHaveBeenCalled()
      expect(result).toBe(
        `${frontUrl}/login/auth?token=mocked-token-b6996120-416f-49cd-841e-e4a5d2e49c9b-${JSON.stringify({
          grant: {
            workspace: 'workspace-uuid',
            role: 'USER',
            grantedBy: 'account-uuid'
          },
          sub: 'generated-person-uuid'
        })}&navigateUrl=${encodeURIComponent(navigateUrl)}`
      )
    })

    test('should throw error for insufficient role', async () => {
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Guest)

      await expect(
        createAccessLink(mockCtx, mockDb, mockBranding, mockToken, {
          role: AccountRole.User
        })
      ).rejects.toThrow(new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {})))

      expect(mockDb.generatePersonUuid).not.toHaveBeenCalled()
    })

    test('should throw error for invalid extra parameter', async () => {
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Maintainer)

      await expect(
        createAccessLink(mockCtx, mockDb, mockBranding, mockToken, {
          role: AccountRole.User,
          extra: 'invalid-json'
        })
      ).rejects.toThrow(new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {})))

      expect(mockDb.generatePersonUuid).not.toHaveBeenCalled()
    })

    test('should create non-personalized access link without UUID with notBefore and expiration', async () => {
      const notBefore = 1703894400 // December 30, 2023 00:00:00 UTC in seconds
      const expiration = 1704067200 // January 1, 2024 00:00:00 UTC in seconds
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Maintainer)

      const result = await createAccessLink(mockCtx, mockDb, mockBranding, mockToken, {
        role: AccountRole.User,
        personalized: false,
        notBefore,
        expiration
      })

      expect(result).toBe(
        `${frontUrl}/login/auth?token=mocked-token-b6996120-416f-49cd-841e-e4a5d2e49c9b-${JSON.stringify({
          grant: {
            workspace: mockWorkspace.uuid,
            role: AccountRole.User,
            grantedBy: 'account-uuid'
          },
          exp: expiration,
          nbf: notBefore
        })}`
      )
      expect(mockDb.generatePersonUuid).not.toHaveBeenCalled()
    })

    test('should throw error when notBefore is in milliseconds', async () => {
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Maintainer)

      await expect(
        createAccessLink(mockCtx, mockDb, mockBranding, mockToken, {
          role: AccountRole.User,
          notBefore: Date.now() // Milliseconds instead of seconds
        })
      ).rejects.toThrow(new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {})))

      expect(mockCtx.error).toHaveBeenCalledWith(
        'Not before appears to be in milliseconds instead of seconds',
        expect.any(Object)
      )
    })

    test('should throw error when expiration is in milliseconds', async () => {
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Maintainer)

      await expect(
        createAccessLink(mockCtx, mockDb, mockBranding, mockToken, {
          role: AccountRole.User,
          expiration: Date.now() // Milliseconds instead of seconds
        })
      ).rejects.toThrow(new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {})))

      expect(mockCtx.error).toHaveBeenCalledWith(
        'Expiration appears to be in milliseconds instead of seconds',
        expect.any(Object)
      )
    })

    test('should throw error when expiration is before notBefore', async () => {
      ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
      ;(mockDb.workspace.findOne as jest.Mock).mockResolvedValue(mockWorkspace)
      ;(mockDb.getWorkspaceRole as jest.Mock).mockResolvedValue(AccountRole.Maintainer)

      await expect(
        createAccessLink(mockCtx, mockDb, mockBranding, mockToken, {
          role: AccountRole.User,
          notBefore: 1000,
          expiration: 900
        })
      ).rejects.toThrow(new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {})))

      expect(mockCtx.error).toHaveBeenCalledWith('Expiration time must be after Not Before time', expect.any(Object))
    })
  })

  describe('authentication operations', () => {
    const mockCtx = {
      error: jest.fn(),
      info: jest.fn()
    } as unknown as MeasureContext

    const mockBranding = null
    const mockToken = 'test-token'

    const mockDb = {
      account: {
        findOne: jest.fn()
      },
      person: {
        findOne: jest.fn()
      },
      socialId: {
        findOne: jest.fn(),
        find: jest.fn()
      }
    } as unknown as AccountDB

    beforeEach(() => {
      jest.clearAllMocks()
    })

    describe('login', () => {
      const mockEmail = 'test@example.com'
      const mockPassword = 'test-password'
      const mockAccountId = 'account-uuid' as AccountUuid
      const mockPersonId = 'person-uuid' as PersonUuid

      test('should successfully login with correct credentials', async () => {
        const mockSocialId: SocialId = {
          _id: 'social-id' as PersonId,
          personUuid: mockAccountId,
          type: SocialIdType.EMAIL,
          value: mockEmail,
          key: `email:${mockEmail}`,
          verifiedOn: Date.now()
        }
        const mockAccount = {
          uuid: mockAccountId,
          hash: 'hashed-password',
          salt: 'salt'
        }
        const mockPerson = {
          uuid: mockPersonId,
          firstName: 'John',
          lastName: 'Doe'
        }

        jest.spyOn(utils, 'verifyPassword').mockReturnValue(true)
        jest.spyOn(utils, 'cleanEmail').mockReturnValue(mockEmail)
        jest.spyOn(utils, 'getEmailSocialId').mockResolvedValue(mockSocialId)
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
        ;(mockDb.person.findOne as jest.Mock).mockResolvedValue(mockPerson)

        const result = await login(mockCtx, mockDb, mockBranding, mockToken, {
          email: mockEmail,
          password: mockPassword
        })

        expect(result).toEqual({
          account: mockAccountId,
          token: expect.any(String),
          name: 'John Doe',
          socialId: 'social-id'
        })
      })

      test('should not return token if no social ids are confirmed', async () => {
        const mockSocialId: SocialId = {
          _id: 'social-id' as PersonId,
          personUuid: mockAccountId,
          type: SocialIdType.EMAIL,
          value: mockEmail,
          key: `email:${mockEmail}`,
          verifiedOn: undefined // Social ID not confirmed
        }
        const mockAccount = {
          uuid: mockAccountId,
          hash: 'hashed-password',
          salt: 'salt'
        }
        const mockPerson = {
          uuid: mockPersonId,
          firstName: 'John',
          lastName: 'Doe'
        }

        jest.spyOn(utils, 'verifyPassword').mockReturnValue(true)
        jest.spyOn(utils, 'cleanEmail').mockReturnValue(mockEmail)
        jest.spyOn(utils, 'getEmailSocialId').mockResolvedValue(mockSocialId)
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
        ;(mockDb.person.findOne as jest.Mock).mockResolvedValue(mockPerson)

        const result = await login(mockCtx, mockDb, mockBranding, mockToken, {
          email: mockEmail,
          password: mockPassword
        })

        expect(result).toEqual({
          account: mockAccountId,
          token: undefined,
          name: 'John Doe',
          socialId: 'social-id'
        })
      })

      test('should fail login with incorrect password', async () => {
        const mockSocialId: SocialId = {
          _id: 'social-id' as PersonId,
          personUuid: mockAccountId,
          type: SocialIdType.EMAIL,
          value: mockEmail,
          key: `email:${mockEmail}`,
          verifiedOn: Date.now()
        }
        const mockAccount = {
          uuid: mockAccountId,
          hash: 'hashed-password',
          salt: 'salt'
        }

        jest.spyOn(utils, 'verifyPassword').mockReturnValue(false)
        jest.spyOn(utils, 'cleanEmail').mockReturnValue(mockEmail)
        jest.spyOn(utils, 'getEmailSocialId').mockResolvedValue(mockSocialId)
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)

        await expect(
          login(mockCtx, mockDb, mockBranding, mockToken, {
            email: mockEmail,
            password: mockPassword
          })
        ).rejects.toThrow(new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, {})))
      })

      test('should fail login with non-existent email', async () => {
        jest.spyOn(utils, 'cleanEmail').mockReturnValue(mockEmail)
        jest.spyOn(utils, 'getEmailSocialId').mockResolvedValue(null)

        await expect(
          login(mockCtx, mockDb, mockBranding, mockToken, {
            email: mockEmail,
            password: mockPassword
          })
        ).rejects.toThrow(new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, {})))
      })
    })

    describe('loginOtp', () => {
      const mockEmail = 'test@example.com'
      const mockAccountId = 'account-uuid' as AccountUuid

      test('should successfully initiate OTP login for existing account', async () => {
        const mockSocialId: SocialId = {
          _id: 'social-id' as PersonId,
          personUuid: mockAccountId,
          type: SocialIdType.EMAIL,
          value: mockEmail,
          key: `email:${mockEmail}`
        }
        const mockAccount = {
          uuid: mockAccountId
        }
        const mockOtpInfo = {
          email: mockEmail,
          sent: true,
          retryOn: Date.now()
        }

        jest.spyOn(utils, 'cleanEmail').mockReturnValue(mockEmail)
        jest.spyOn(utils, 'getEmailSocialId').mockResolvedValue(mockSocialId)
        jest.spyOn(utils, 'sendOtp').mockResolvedValue(mockOtpInfo)
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)

        const result = await loginOtp(mockCtx, mockDb, mockBranding, mockToken, {
          email: mockEmail
        })

        expect(result).toEqual(mockOtpInfo)
        expect(utils.sendOtp).toHaveBeenCalledWith(mockCtx, mockDb, mockBranding, mockSocialId)
      })

      test('should fail for non-existent account', async () => {
        jest.spyOn(utils, 'cleanEmail').mockReturnValue(mockEmail)
        jest.spyOn(utils, 'getEmailSocialId').mockResolvedValue(null)

        await expect(
          loginOtp(mockCtx, mockDb, mockBranding, mockToken, {
            email: mockEmail
          })
        ).rejects.toThrow(new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, {})))
      })
    })

    describe('loginAsGuest', () => {
      test('should successfully login as readonly guest', async () => {
        const mockGuestPerson = {
          uuid: readOnlyGuestAccountUuid
        }

        ;(mockDb.person.findOne as jest.Mock).mockResolvedValue(mockGuestPerson)

        const result = await loginAsGuest(mockCtx, mockDb, mockBranding, mockToken)

        expect(result).toEqual({
          account: readOnlyGuestAccountUuid,
          token: expect.any(String)
        })
      })

      test('should fail if guest account not found', async () => {
        ;(mockDb.person.findOne as jest.Mock).mockResolvedValue(null)

        await expect(loginAsGuest(mockCtx, mockDb, mockBranding, mockToken)).rejects.toThrow(
          new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, {}))
        )
      })
    })
  })

  describe('registration operations', () => {
    const mockCtx = {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn()
    } as unknown as MeasureContext

    const mockBranding = null
    const mockToken = 'test-token'
    const mockEmail = 'test@example.com'
    const mockPassword = 'test-password'
    const mockFirstName = 'John'
    const mockLastName = 'Doe'
    const mockAccountId = 'account-uuid' as AccountUuid
    const mockPersonId = 'person-uuid' as PersonUuid

    const mockDb = {
      account: {
        findOne: jest.fn()
      },
      person: {
        findOne: jest.fn(),
        insertOne: jest.fn(),
        update: jest.fn()
      },
      socialId: {
        findOne: jest.fn(),
        find: jest.fn(),
        insertOne: jest.fn(),
        update: jest.fn()
      },
      otp: {
        deleteMany: jest.fn()
      }
    } as unknown as AccountDB

    beforeEach(() => {
      jest.clearAllMocks()
    })

    describe('signUp', () => {
      test('should create account when email service not configured', async () => {
        const mockSocialId = {
          _id: 'social-id' as PersonId,
          personUuid: mockAccountId,
          type: SocialIdType.EMAIL,
          value: mockEmail,
          key: `email:${mockEmail}`
        }

        const mockPerson = {
          uuid: mockPersonId,
          firstName: mockFirstName,
          lastName: mockLastName
        }

        jest.spyOn(utils, 'signUpByEmail').mockResolvedValue({
          account: mockAccountId,
          socialId: mockSocialId._id
        })
        jest.spyOn(utils, 'confirmEmail').mockResolvedValue(mockSocialId._id)
        jest.spyOn(utils, 'confirmHulyIds').mockResolvedValue()
        ;(mockDb.person.findOne as jest.Mock).mockResolvedValue(mockPerson)
        ;(getMetadata as jest.Mock).mockReturnValue('') // No mail service configured

        const result = await signUp(mockCtx, mockDb, mockBranding, mockToken, {
          email: mockEmail,
          password: mockPassword,
          firstName: mockFirstName,
          lastName: mockLastName
        })

        expect(result).toEqual({
          account: mockAccountId,
          name: 'John Doe',
          socialId: mockSocialId._id,
          token: expect.any(String)
        })

        expect(utils.signUpByEmail).toHaveBeenCalledWith(
          mockCtx,
          mockDb,
          mockBranding,
          mockEmail,
          mockPassword,
          mockFirstName,
          mockLastName
        )
        expect(utils.confirmEmail).toHaveBeenCalledWith(mockCtx, mockDb, mockAccountId, mockEmail)
        expect(utils.confirmHulyIds).toHaveBeenCalledWith(mockCtx, mockDb, mockAccountId)
        expect(mockCtx.warn).toHaveBeenCalled()
      })

      test('should create account and send confirmation when email service configured', async () => {
        const mockSocialId = {
          _id: 'social-id' as PersonId,
          personUuid: mockAccountId,
          type: SocialIdType.EMAIL,
          value: mockEmail,
          key: `email:${mockEmail}`
        }

        const mockPerson = {
          uuid: mockPersonId,
          firstName: mockFirstName,
          lastName: mockLastName
        }

        jest.spyOn(utils, 'signUpByEmail').mockResolvedValue({
          account: mockAccountId,
          socialId: mockSocialId._id
        })
        jest.spyOn(utils, 'sendEmailConfirmation').mockResolvedValue()
        ;(mockDb.person.findOne as jest.Mock).mockResolvedValue(mockPerson)
        ;(getMetadata as jest.Mock).mockReturnValue('http://mail-service.com')

        const result = await signUp(mockCtx, mockDb, mockBranding, mockToken, {
          email: mockEmail,
          password: mockPassword,
          firstName: mockFirstName,
          lastName: mockLastName
        })

        expect(result).toEqual({
          account: mockAccountId,
          name: 'John Doe',
          socialId: mockSocialId._id,
          token: undefined // No token until email confirmed
        })

        expect(utils.signUpByEmail).toHaveBeenCalledWith(
          mockCtx,
          mockDb,
          mockBranding,
          mockEmail,
          mockPassword,
          mockFirstName,
          mockLastName
        )
        expect(utils.sendEmailConfirmation).toHaveBeenCalledWith(mockCtx, mockBranding, mockAccountId, mockEmail)
        expect(mockCtx.warn).not.toHaveBeenCalled()
      })

      test('should fail with missing required fields', async () => {
        const testCases = [
          { email: '', password: mockPassword, firstName: mockFirstName },
          { email: mockEmail, password: '', firstName: mockFirstName },
          { email: mockEmail, password: mockPassword, firstName: '' }
        ]

        for (const testCase of testCases) {
          await expect(signUp(mockCtx, mockDb, mockBranding, mockToken, testCase as any)).rejects.toThrow(
            new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
          )
        }
      })
    })

    describe('confirm', () => {
      test('should confirm email and return login info', async () => {
        const mockSocialId = {
          _id: 'social-id' as PersonId,
          personUuid: mockAccountId,
          type: SocialIdType.EMAIL,
          value: mockEmail,
          key: `email:${mockEmail}`
        }

        const mockPerson = {
          uuid: mockPersonId,
          firstName: mockFirstName,
          lastName: mockLastName
        }

        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: mockAccountId,
          extra: { confirmEmail: mockEmail }
        })

        jest.spyOn(utils, 'confirmEmail').mockResolvedValue(mockSocialId._id)
        jest.spyOn(utils, 'confirmHulyIds').mockResolvedValue()
        ;(mockDb.person.findOne as jest.Mock).mockResolvedValue(mockPerson)

        const result = await confirm(mockCtx, mockDb, mockBranding, mockToken)

        expect(result).toEqual({
          account: mockAccountId,
          name: 'John Doe',
          socialId: mockSocialId._id,
          token: expect.any(String)
        })

        expect(utils.confirmEmail).toHaveBeenCalledWith(mockCtx, mockDb, mockAccountId, mockEmail)
        expect(utils.confirmHulyIds).toHaveBeenCalledWith(mockCtx, mockDb, mockAccountId)
      })

      test('should fail if confirmation email not in token', async () => {
        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: mockAccountId,
          extra: {} // No confirmEmail in extra
        })

        await expect(confirm(mockCtx, mockDb, mockBranding, mockToken)).rejects.toThrow(
          new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {}))
        )
      })

      test('should fail if person not found', async () => {
        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: mockAccountId,
          extra: { confirmEmail: mockEmail }
        })

        jest.spyOn(utils, 'confirmEmail').mockResolvedValue('social-id' as PersonId)
        jest.spyOn(utils, 'confirmHulyIds').mockResolvedValue()
        ;(mockDb.person.findOne as jest.Mock).mockResolvedValue(null)

        await expect(confirm(mockCtx, mockDb, mockBranding, mockToken)).rejects.toThrow(
          new PlatformError(new Status(Severity.ERROR, platform.status.PersonNotFound, { person: mockAccountId }))
        )
      })
    })

    describe('signUpOtp', () => {
      test('should initiate signup with OTP for new user', async () => {
        const mockSocialId: SocialId = {
          _id: 'social-id' as PersonId,
          personUuid: mockPersonId,
          type: SocialIdType.EMAIL,
          value: mockEmail,
          key: `email:${mockEmail}`
        }

        // No existing social id
        jest.spyOn(utils, 'getEmailSocialId').mockResolvedValue(null)
        jest.spyOn(utils, 'sendOtp').mockResolvedValue({ retryOn: Date.now() + 60000, sent: true })
        ;(mockDb.person.insertOne as jest.Mock).mockResolvedValue(mockPersonId)
        ;(mockDb.socialId.insertOne as jest.Mock).mockResolvedValue(mockSocialId._id)

        const result = await signUpOtp(mockCtx, mockDb, mockBranding, mockToken, {
          email: mockEmail,
          firstName: mockFirstName,
          lastName: mockLastName
        })

        expect(result).toEqual({ retryOn: expect.any(Number), sent: true })
        expect(mockDb.person.insertOne).toHaveBeenCalledWith({
          firstName: mockFirstName,
          lastName: mockLastName
        })
      })

      test('should initiate signup with OTP for existing unverified email', async () => {
        const mockSocialId: SocialId = {
          _id: 'social-id' as PersonId,
          personUuid: mockPersonId,
          type: SocialIdType.EMAIL,
          value: mockEmail,
          key: `email:${mockEmail}`
        }

        // Existing unverified social id
        jest.spyOn(utils, 'getEmailSocialId').mockResolvedValue(mockSocialId)
        jest.spyOn(utils, 'sendOtp').mockResolvedValue({ retryOn: Date.now() + 60000, sent: true })
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(null)

        const result = await signUpOtp(mockCtx, mockDb, mockBranding, mockToken, {
          email: mockEmail,
          firstName: mockFirstName,
          lastName: mockLastName
        })

        expect(result).toEqual({ retryOn: expect.any(Number), sent: true })
        expect(mockDb.person.update).toHaveBeenCalledWith(
          { uuid: mockPersonId },
          { firstName: mockFirstName, lastName: mockLastName }
        )
      })

      test('should fail if email already exists with account', async () => {
        const mockSocialId: SocialId = {
          _id: 'social-id' as PersonId,
          personUuid: mockPersonId,
          type: SocialIdType.EMAIL,
          value: mockEmail,
          key: `email:${mockEmail}`
        }

        jest.spyOn(utils, 'getEmailSocialId').mockResolvedValue(mockSocialId)
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue({ uuid: mockPersonId })

        await expect(
          signUpOtp(mockCtx, mockDb, mockBranding, mockToken, {
            email: mockEmail,
            firstName: mockFirstName,
            lastName: mockLastName
          })
        ).rejects.toThrow(new PlatformError(new Status(Severity.ERROR, platform.status.AccountAlreadyExists, {})))
      })

      test('should fail with missing required fields', async () => {
        const testCases = [
          { email: '', firstName: mockFirstName },
          { email: mockEmail, firstName: '' }
        ]

        for (const testCase of testCases) {
          await expect(signUpOtp(mockCtx, mockDb, mockBranding, mockToken, testCase as any)).rejects.toThrow(
            new PlatformError(new Status(Severity.ERROR, platform.status.BadRequest, {}))
          )
        }
      })
    })

    describe('validateOtp', () => {
      beforeEach(() => {
        jest.spyOn(utils, 'setPassword').mockResolvedValue()
      })

      test('should validate OTP and create account for signup', async () => {
        const personId = 'social-id' as PersonId
        const mockSocialId: SocialId = {
          _id: personId,
          personUuid: mockPersonId,
          type: SocialIdType.EMAIL,
          value: mockEmail,
          key: `email:${mockEmail}`
        }

        jest.spyOn(utils, 'getEmailSocialId').mockResolvedValue(mockSocialId)
        jest.spyOn(utils, 'isOtpValid').mockResolvedValue(true)
        jest.spyOn(utils, 'createAccount').mockResolvedValue(personId)

        const mockPerson = {
          uuid: mockPersonId,
          firstName: mockFirstName,
          lastName: mockLastName
        }
        ;(mockDb.person.findOne as jest.Mock).mockResolvedValue(mockPerson)
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(null)

        const result = await validateOtp(mockCtx, mockDb, mockBranding, mockToken, {
          email: mockEmail,
          code: '123456',
          password: mockPassword
        })

        expect(result).toEqual({
          account: mockPersonId,
          name: 'John Doe',
          socialId: mockSocialId._id,
          token: expect.any(String)
        })

        expect(mockDb.otp.deleteMany).toHaveBeenCalledWith({ socialId: mockSocialId._id })
        expect(mockDb.socialId.update).toHaveBeenCalledWith(
          { _id: mockSocialId._id },
          { verifiedOn: expect.any(Number) }
        )
        expect(utils.setPassword).toHaveBeenCalledWith(mockCtx, mockDb, mockBranding, mockPersonId, mockPassword)
      })

      test('should validate OTP for login', async () => {
        const mockSocialId: SocialId = {
          _id: 'social-id' as PersonId,
          personUuid: mockPersonId,
          type: SocialIdType.EMAIL,
          value: mockEmail,
          key: `email:${mockEmail}`,
          verifiedOn: Date.now()
        }

        const mockAccount = {
          uuid: mockPersonId
        }

        const mockPerson = {
          uuid: mockPersonId,
          firstName: mockFirstName,
          lastName: mockLastName
        }

        jest.spyOn(utils, 'getEmailSocialId').mockResolvedValue(mockSocialId)
        jest.spyOn(utils, 'isOtpValid').mockResolvedValue(true)
        jest.spyOn(utils, 'confirmHulyIds').mockResolvedValue()
        ;(mockDb.person.findOne as jest.Mock).mockResolvedValue(mockPerson)
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)

        const result = await validateOtp(mockCtx, mockDb, mockBranding, mockToken, {
          email: mockEmail,
          code: '123456'
        })

        expect(result).toEqual({
          account: mockPersonId,
          name: 'John Doe',
          socialId: mockSocialId._id,
          token: expect.any(String)
        })

        expect(mockDb.otp.deleteMany).toHaveBeenCalledWith({ socialId: mockSocialId._id })
        expect(utils.setPassword).not.toHaveBeenCalled()
      })

      test('should validate OTP for unverified social id belonging to caller', async () => {
        const callerAccountId = 'caller-account' as AccountUuid
        const mockSocialId: SocialId = {
          _id: 'social-id' as PersonId,
          personUuid: callerAccountId,
          type: SocialIdType.EMAIL,
          value: mockEmail,
          key: `email:${mockEmail}`
        }

        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: callerAccountId
        })

        jest.spyOn(utils, 'getEmailSocialId').mockResolvedValue(mockSocialId)
        jest.spyOn(utils, 'isOtpValid').mockResolvedValue(true)
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue({ uuid: callerAccountId })
        ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue(mockSocialId)
        ;(mockDb.person.findOne as jest.Mock).mockResolvedValue({
          uuid: mockPersonId,
          firstName: mockFirstName,
          lastName: mockLastName
        })

        const result = await validateOtp(mockCtx, mockDb, mockBranding, mockToken, {
          email: mockEmail,
          code: '123456',
          action: 'verify'
        })

        expect(result).toEqual({
          account: callerAccountId,
          name: 'John Doe',
          socialId: mockSocialId._id,
          token: expect.any(String)
        })

        expect(mockDb.otp.deleteMany).toHaveBeenCalledWith({ socialId: mockSocialId._id })
        expect(mockDb.socialId.update).toHaveBeenCalledWith(
          { _id: mockSocialId._id },
          { verifiedOn: expect.any(Number) }
        )
        expect(utils.setPassword).not.toHaveBeenCalled()
      })

      test('should merge person to caller when verifying social id without account', async () => {
        const callerAccountId = 'caller-account' as AccountUuid
        const targetPersonId = 'target-person' as PersonUuid
        const mockSocialId: SocialId = {
          _id: 'social-id' as PersonId,
          personUuid: targetPersonId,
          type: SocialIdType.EMAIL,
          value: mockEmail,
          key: `email:${mockEmail}`
        }

        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: callerAccountId
        })

        jest.spyOn(utils, 'getEmailSocialId').mockResolvedValue(mockSocialId)
        jest.spyOn(utils, 'isOtpValid').mockResolvedValue(true)
        jest.spyOn(utils, 'doMergePersons').mockResolvedValue()
        ;(mockDb.account.findOne as jest.Mock).mockImplementation(async ({ uuid }) => {
          if (uuid === callerAccountId) {
            return { uuid: callerAccountId }
          }
          if (uuid === targetPersonId) {
            return null // The target person has no account
          }
          return null
        })
        ;(mockDb.socialId.findOne as jest.Mock).mockResolvedValue({ ...mockSocialId, personUuid: callerAccountId })
        ;(mockDb.person.findOne as jest.Mock).mockResolvedValue({
          uuid: callerAccountId,
          firstName: mockFirstName,
          lastName: mockLastName
        })

        const result = await validateOtp(mockCtx, mockDb, mockBranding, mockToken, {
          email: mockEmail,
          code: '123456',
          action: 'verify'
        })

        expect(result).toEqual({
          account: callerAccountId,
          name: 'John Doe',
          socialId: mockSocialId._id,
          token: expect.any(String)
        })

        expect(mockDb.otp.deleteMany).toHaveBeenCalledWith({ socialId: mockSocialId._id })
        expect(utils.doMergePersons).toHaveBeenCalledWith(mockDb, callerAccountId, targetPersonId)
        expect(mockDb.socialId.update).toHaveBeenCalledWith(
          { _id: mockSocialId._id },
          { verifiedOn: expect.any(Number) }
        )
      })

      test('should move unverified social id to caller account', async () => {
        const callerAccountId = 'caller-account' as AccountUuid
        const targetAccountId = 'target-account' as AccountUuid
        const mockSocialId: SocialId = {
          _id: 'social-id' as PersonId,
          personUuid: targetAccountId,
          type: SocialIdType.EMAIL,
          value: mockEmail,
          key: `email:${mockEmail}`
        }

        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: callerAccountId
        })

        jest.spyOn(utils, 'getEmailSocialId').mockResolvedValue(mockSocialId)
        jest.spyOn(utils, 'isOtpValid').mockResolvedValue(true)
        ;(mockDb.account.findOne as jest.Mock).mockImplementation(async ({ uuid }) =>
          uuid === targetAccountId ? { uuid: targetAccountId } : { uuid: callerAccountId }
        )
        ;(mockDb.person.findOne as jest.Mock).mockResolvedValue({
          uuid: callerAccountId,
          firstName: mockFirstName,
          lastName: mockLastName
        })

        const result = await validateOtp(mockCtx, mockDb, mockBranding, mockToken, {
          email: mockEmail,
          code: '123456',
          action: 'verify'
        })

        expect(result).toEqual({
          account: callerAccountId,
          name: 'John Doe',
          socialId: mockSocialId._id,
          token: expect.any(String)
        })

        expect(mockDb.otp.deleteMany).toHaveBeenCalledWith({ socialId: mockSocialId._id })
        expect(mockDb.socialId.update).toHaveBeenCalledWith(
          { _id: mockSocialId._id },
          { personUuid: callerAccountId, verifiedOn: expect.any(Number) }
        )
      })

      test('should fail if OTP is invalid', async () => {
        const mockSocialId: SocialId = {
          _id: 'social-id' as PersonId,
          personUuid: mockPersonId,
          type: SocialIdType.EMAIL,
          value: mockEmail,
          key: `email:${mockEmail}`
        }

        jest.spyOn(utils, 'getEmailSocialId').mockResolvedValue(mockSocialId)
        jest.spyOn(utils, 'isOtpValid').mockResolvedValue(false)

        await expect(
          validateOtp(mockCtx, mockDb, mockBranding, mockToken, {
            email: mockEmail,
            code: '123456'
          })
        ).rejects.toThrow(new PlatformError(new Status(Severity.ERROR, platform.status.InvalidOtp, {})))
      })

      test('should fail if email not found', async () => {
        jest.spyOn(utils, 'getEmailSocialId').mockResolvedValue(null)

        await expect(
          validateOtp(mockCtx, mockDb, mockBranding, mockToken, {
            email: mockEmail,
            code: '123456'
          })
        ).rejects.toThrow(
          new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: mockEmail }))
        )
      })

      test('should fail if verifying for existing verified social id', async () => {
        const mockSocialId: SocialId = {
          _id: 'social-id' as PersonId,
          personUuid: mockPersonId,
          type: SocialIdType.EMAIL,
          value: mockEmail,
          key: `email:${mockEmail}`,
          verifiedOn: Date.now()
        }

        const callerAccountId = 'caller-account' as AccountUuid
        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: callerAccountId
        })

        jest.spyOn(utils, 'getEmailSocialId').mockResolvedValue(mockSocialId)
        jest.spyOn(utils, 'isOtpValid').mockResolvedValue(true)
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue({ uuid: mockPersonId })

        await expect(
          validateOtp(mockCtx, mockDb, mockBranding, mockToken, {
            email: mockEmail,
            code: '123456',
            action: 'verify'
          })
        ).rejects.toThrow(new PlatformError(new Status(Severity.ERROR, platform.status.AccountAlreadyExists, {})))
      })
    })
  })

  describe('password operations', () => {
    const mockCtx = {
      error: jest.fn(),
      info: jest.fn()
    } as unknown as MeasureContext

    const mockBranding = null
    const mockToken = 'test-token'
    const mockAccountId = 'account-uuid' as AccountUuid
    const mockEmail = 'test@example.com'
    const mockOldPassword = 'old-password'
    const mockNewPassword = 'new-password'

    const mockDb = {
      account: {
        findOne: jest.fn()
      },
      person: {
        findOne: jest.fn()
      },
      socialId: {
        findOne: jest.fn(),
        update: jest.fn()
      }
    } as unknown as AccountDB

    beforeEach(() => {
      jest.clearAllMocks()
      global.fetch = jest.fn().mockResolvedValue({ ok: true })
    })

    describe('changePassword', () => {
      test('should change password when old password is correct', async () => {
        const mockAccount = {
          uuid: mockAccountId,
          hash: 'old-hash',
          salt: 'old-salt'
        }

        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: mockAccountId
        })
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
        jest.spyOn(utils, 'verifyPassword').mockReturnValue(true)
        jest.spyOn(utils, 'setPassword').mockResolvedValue()

        await changePassword(mockCtx, mockDb, mockBranding, mockToken, {
          oldPassword: mockOldPassword,
          newPassword: mockNewPassword
        })

        expect(utils.verifyPassword).toHaveBeenCalledWith(mockOldPassword, mockAccount.hash, mockAccount.salt)
        expect(utils.setPassword).toHaveBeenCalledWith(mockCtx, mockDb, mockBranding, mockAccountId, mockNewPassword)
      })

      test('should fail if old password is incorrect', async () => {
        const mockAccount = {
          uuid: mockAccountId,
          hash: 'old-hash',
          salt: 'old-salt'
        }

        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: mockAccountId
        })
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
        jest.spyOn(utils, 'verifyPassword').mockReturnValue(false)

        await expect(
          changePassword(mockCtx, mockDb, mockBranding, mockToken, {
            oldPassword: mockOldPassword,
            newPassword: mockNewPassword
          })
        ).rejects.toThrow(new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {})))

        expect(utils.setPassword).not.toHaveBeenCalled()
      })

      test('should fail if account not found', async () => {
        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: mockAccountId
        })
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(null)

        await expect(
          changePassword(mockCtx, mockDb, mockBranding, mockToken, {
            oldPassword: mockOldPassword,
            newPassword: mockNewPassword
          })
        ).rejects.toThrow(
          new PlatformError(new Status(Severity.ERROR, platform.status.AccountNotFound, { account: mockAccountId }))
        )
      })
    })

    describe('requestPasswordReset', () => {
      const mailUrl = 'https://mail.example.com'
      const mailAuth = 'mail-auth-token'
      const frontUrl = 'https://front.example.com'

      beforeEach(() => {
        ;(getMetadata as jest.Mock).mockImplementation((key) => {
          switch (key) {
            case accountPlugin.metadata.MAIL_URL:
              return mailUrl
            case accountPlugin.metadata.MAIL_AUTH_TOKEN:
              return mailAuth
            case accountPlugin.metadata.FrontURL:
              return frontUrl
            default:
              return undefined
          }
        })
      })

      test('should send reset password email', async () => {
        const mockSocialId = {
          _id: 'social-id' as PersonId,
          personUuid: mockAccountId,
          type: SocialIdType.EMAIL,
          value: mockEmail,
          key: `email:${mockEmail}`
        }

        const mockAccount = {
          uuid: mockAccountId
        }

        jest.spyOn(utils, 'getEmailSocialId').mockResolvedValue(mockSocialId)
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)

        await requestPasswordReset(mockCtx, mockDb, mockBranding, mockToken, {
          email: mockEmail
        })

        expect(global.fetch).toHaveBeenCalledWith(`${mailUrl}/send`, {
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mailAuth}`
          },
          body: expect.stringContaining(mockEmail)
        })
      })

      test('should fail if email not found', async () => {
        jest.spyOn(utils, 'getEmailSocialId').mockResolvedValue(null)

        await expect(
          requestPasswordReset(mockCtx, mockDb, mockBranding, mockToken, {
            email: mockEmail
          })
        ).rejects.toThrow(
          new PlatformError(
            new Status(Severity.ERROR, platform.status.SocialIdNotFound, {
              value: mockEmail,
              type: SocialIdType.EMAIL
            })
          )
        )

        expect(global.fetch).not.toHaveBeenCalled()
      })

      test('should fail if account not found', async () => {
        const mockSocialId = {
          _id: 'social-id' as PersonId,
          personUuid: mockAccountId,
          type: SocialIdType.EMAIL,
          value: mockEmail,
          key: `email:${mockEmail}`
        }

        jest.spyOn(utils, 'getEmailSocialId').mockResolvedValue(mockSocialId)
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(null)

        await expect(
          requestPasswordReset(mockCtx, mockDb, mockBranding, mockToken, {
            email: mockEmail
          })
        ).rejects.toThrow(
          new PlatformError(
            new Status(Severity.ERROR, platform.status.AccountNotFound, {
              account: mockAccountId
            })
          )
        )

        expect(global.fetch).not.toHaveBeenCalled()
      })
    })

    describe('restorePassword', () => {
      test('should restore password and return login info', async () => {
        const mockSocialId = {
          _id: 'social-id' as PersonId,
          personUuid: mockAccountId,
          type: SocialIdType.EMAIL,
          value: mockEmail,
          key: `email:${mockEmail}`,
          verifiedOn: undefined
        }
        const mockPerson = {
          uuid: mockAccountId,
          firstName: 'John',
          lastName: 'Doe'
        }
        const mockAccount = { uuid: mockAccountId }

        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: mockAccountId,
          extra: { restoreEmail: mockEmail }
        })
        jest
          .spyOn(utils, 'getEmailSocialId')
          .mockImplementationOnce(async () => mockSocialId)
          .mockImplementationOnce(async () => ({ ...mockSocialId, verifiedOn: Date.now() }))
        jest.spyOn(utils, 'setPassword').mockResolvedValue()
        jest.spyOn(utils, 'verifyPassword').mockReturnValue(true)
        ;(mockDb.person.findOne as jest.Mock).mockResolvedValue(mockPerson)
        ;(mockDb.account.findOne as jest.Mock).mockResolvedValue(mockAccount)
        const result = await restorePassword(mockCtx, mockDb, mockBranding, mockToken, {
          password: mockNewPassword
        })

        expect(result).toEqual({
          account: mockAccountId,
          name: 'John Doe',
          token: expect.any(String),
          socialId: mockSocialId._id
        })

        expect(utils.setPassword).toHaveBeenCalledWith(mockCtx, mockDb, mockBranding, mockAccountId, mockNewPassword)
        expect(mockDb.socialId.update).toHaveBeenCalledWith(
          { key: mockSocialId.key },
          { verifiedOn: expect.any(Number) }
        )
      })

      test('should fail if restore email not in token', async () => {
        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: mockAccountId,
          extra: {} // No restoreEmail
        })

        await expect(
          restorePassword(mockCtx, mockDb, mockBranding, mockToken, {
            password: mockNewPassword
          })
        ).rejects.toThrow(new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {})))
      })

      test('should fail if email not found', async () => {
        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: mockAccountId,
          extra: { restoreEmail: mockEmail }
        })
        jest.spyOn(utils, 'getEmailSocialId').mockResolvedValue(null)

        await expect(
          restorePassword(mockCtx, mockDb, mockBranding, mockToken, {
            password: mockNewPassword
          })
        ).rejects.toThrow(
          new PlatformError(
            new Status(Severity.ERROR, platform.status.SocialIdNotFound, {
              value: mockEmail,
              type: SocialIdType.EMAIL
            })
          )
        )
      })
    })
  })

  describe('info operations', () => {
    const mockCtx = {
      error: jest.fn(),
      info: jest.fn()
    } as unknown as MeasureContext

    const mockBranding = null
    const mockToken = 'test-token'
    const mockAccountId = 'account-uuid' as AccountUuid

    const mockDb = {
      person: {
        findOne: jest.fn()
      },
      socialId: {
        find: jest.fn()
      }
    } as unknown as AccountDB

    beforeEach(() => {
      jest.clearAllMocks()
    })

    describe('getSocialIds', () => {
      test('should return confirmed social ids', async () => {
        const mockSocialIds: SocialId[] = [
          {
            _id: 'social-id-1' as PersonId,
            personUuid: mockAccountId,
            type: SocialIdType.EMAIL,
            value: 'test@example.com',
            key: 'email:test@example.com',
            verifiedOn: Date.now()
          },
          {
            _id: 'social-id-2' as PersonId,
            personUuid: mockAccountId,
            type: SocialIdType.GITHUB,
            value: 'testuser',
            key: 'github:testuser',
            verifiedOn: Date.now()
          }
        ]

        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: mockAccountId
        })
        ;(mockDb.socialId.find as jest.Mock).mockResolvedValue(mockSocialIds)

        const result = await getSocialIds(mockCtx, mockDb, mockBranding, mockToken, {
          confirmed: true,
          includeDeleted: false
        })

        expect(result).toEqual(mockSocialIds)
        expect(mockDb.socialId.find).toHaveBeenCalledWith({
          personUuid: mockAccountId,
          verifiedOn: { $gt: 0 }
        })
      })

      test('should exclude deleted social ids when requested', async () => {
        const mockSocialIds: SocialId[] = [
          {
            _id: 'social-id-1' as PersonId,
            personUuid: mockAccountId,
            type: SocialIdType.EMAIL,
            value: 'test@example.com',
            key: 'email:test@example.com',
            verifiedOn: Date.now()
          },
          {
            _id: 'social-id-2' as PersonId,
            personUuid: mockAccountId,
            type: SocialIdType.GITHUB,
            value: 'testuser',
            key: 'github:testuser',
            verifiedOn: Date.now(),
            isDeleted: true
          }
        ]

        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: mockAccountId
        })
        ;(mockDb.socialId.find as jest.Mock).mockResolvedValue(mockSocialIds)

        const result = await getSocialIds(mockCtx, mockDb, mockBranding, mockToken, {
          confirmed: true,
          includeDeleted: false
        })

        expect(result).toEqual([mockSocialIds[0]])
      })

      test('should fail when requesting unconfirmed social ids', async () => {
        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: mockAccountId
        })

        await expect(
          getSocialIds(mockCtx, mockDb, mockBranding, mockToken, {
            confirmed: false,
            includeDeleted: false
          })
        ).rejects.toThrow(new PlatformError(new Status(Severity.ERROR, platform.status.Forbidden, {})))

        expect(mockDb.socialId.find).not.toHaveBeenCalled()
      })
    })

    describe('getPerson', () => {
      test('should return person info', async () => {
        const mockPerson = {
          uuid: mockAccountId,
          firstName: 'John',
          lastName: 'Doe'
        }

        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: mockAccountId
        })
        ;(mockDb.person.findOne as jest.Mock).mockResolvedValue(mockPerson)

        const result = await getPerson(mockCtx, mockDb, mockBranding, mockToken)

        expect(result).toEqual(mockPerson)
        expect(mockDb.person.findOne).toHaveBeenCalledWith({ uuid: mockAccountId })
      })

      test('should fail if person not found', async () => {
        ;(decodeTokenVerbose as jest.Mock).mockReturnValue({
          account: mockAccountId
        })
        ;(mockDb.person.findOne as jest.Mock).mockResolvedValue(null)

        await expect(getPerson(mockCtx, mockDb, mockBranding, mockToken)).rejects.toThrow(
          new PlatformError(new Status(Severity.ERROR, platform.status.PersonNotFound, { person: mockAccountId }))
        )
      })
    })
  })
})
