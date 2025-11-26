//
// Copyright © 2025 Hardcore Engineering Inc.
//

import { getWorkspaceToken } from '../utils'
import { loadServerConfig } from '../config'
import { getClient as getAccountClient } from '@hcengineering/account-client'

// Mock dependencies
jest.mock('../config')
jest.mock('@hcengineering/account-client')

describe('getWorkspaceToken', () => {
  const mockConfig = {
    ACCOUNTS_URL: 'https://accounts.example.com',
    COLLABORATOR_URL: 'https://collaborator.example.com',
    FILES_URL: 'https://files.example.com',
    UPLOAD_URL: 'https://upload.example.com'
  }

  const mockWorkspaceInfo = {
    endpoint: 'wss://workspace.example.com',
    token: 'workspace-token-123',
    workspace: 'workspace-id-123' as any,
    email: 'user@example.com',
    workspaceId: 'workspace-id-123',
    workspaceName: 'Test Workspace',
    workspaceUrl: 'https://workspace.example.com',
    createdOn: Date.now(),
    lastVisit: Date.now(),
    role: 0,
    account: 'account-id-123' as any
  }

  const mockLoginInfo = {
    token: 'login-token-456',
    endpoint: 'wss://endpoint.example.com'
  }

  let mockAccountClient: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockAccountClient = {
      login: jest.fn().mockResolvedValue(mockLoginInfo),
      selectWorkspace: jest.fn().mockResolvedValue(mockWorkspaceInfo)
    }
    ;(getAccountClient as jest.Mock).mockReturnValue(mockAccountClient)
    ;(loadServerConfig as jest.Mock).mockResolvedValue(mockConfig)
  })

  describe('with email/password authentication', () => {
    it('should successfully get workspace token with credentials', async () => {
      const result = await getWorkspaceToken('https://api.example.com', {
        email: 'user@example.com',
        password: 'password123',
        workspace: 'test-workspace'
      })

      expect(loadServerConfig).toHaveBeenCalledWith('https://api.example.com')
      expect(mockAccountClient.login).toHaveBeenCalledWith('user@example.com', 'password123')
      expect(mockAccountClient.selectWorkspace).toHaveBeenCalledWith('test-workspace')

      expect(result).toEqual({
        endpoint: mockWorkspaceInfo.endpoint,
        token: mockWorkspaceInfo.token,
        workspaceId: mockWorkspaceInfo.workspace,
        info: mockWorkspaceInfo
      })
    })

    it('should use provided config if available', async () => {
      await getWorkspaceToken(
        'https://api.example.com',
        {
          email: 'user@example.com',
          password: 'password123',
          workspace: 'test-workspace'
        },
        mockConfig
      )

      expect(loadServerConfig).not.toHaveBeenCalled()
      expect(getAccountClient).toHaveBeenCalledWith(mockConfig.ACCOUNTS_URL)
    })

    it('should throw error when login fails', async () => {
      mockAccountClient.login.mockResolvedValue({ token: undefined })

      await expect(
        getWorkspaceToken('https://api.example.com', {
          email: 'user@example.com',
          password: 'wrong-password',
          workspace: 'test-workspace'
        })
      ).rejects.toThrow('Login failed')
    })

    it('should throw error when workspace not found', async () => {
      mockAccountClient.selectWorkspace.mockResolvedValue(undefined)

      await expect(
        getWorkspaceToken('https://api.example.com', {
          email: 'user@example.com',
          password: 'password123',
          workspace: 'non-existent-workspace'
        })
      ).rejects.toThrow('Workspace not found')
    })
  })

  describe('with token authentication', () => {
    it('should successfully get workspace token with existing token', async () => {
      const result = await getWorkspaceToken('https://api.example.com', {
        token: 'existing-token-789',
        workspace: 'test-workspace'
      })

      expect(mockAccountClient.login).not.toHaveBeenCalled()
      expect(getAccountClient).toHaveBeenCalledWith(mockConfig.ACCOUNTS_URL, 'existing-token-789')
      expect(mockAccountClient.selectWorkspace).toHaveBeenCalledWith('test-workspace')

      expect(result).toEqual({
        endpoint: mockWorkspaceInfo.endpoint,
        token: mockWorkspaceInfo.token,
        workspaceId: mockWorkspaceInfo.workspace,
        info: mockWorkspaceInfo
      })
    })

    it('should throw error when workspace not found with token', async () => {
      mockAccountClient.selectWorkspace.mockResolvedValue(undefined)

      await expect(
        getWorkspaceToken('https://api.example.com', {
          token: 'existing-token-789',
          workspace: 'non-existent-workspace'
        })
      ).rejects.toThrow('Workspace not found')
    })
  })

  describe('error handling', () => {
    it('should propagate config loading errors', async () => {
      ;(loadServerConfig as jest.Mock).mockRejectedValue(new Error('Config load failed'))

      await expect(
        getWorkspaceToken('https://api.example.com', {
          email: 'user@example.com',
          password: 'password123',
          workspace: 'test-workspace'
        })
      ).rejects.toThrow('Config load failed')
    })

    it('should propagate login errors', async () => {
      mockAccountClient.login.mockRejectedValue(new Error('Invalid credentials'))

      await expect(
        getWorkspaceToken('https://api.example.com', {
          email: 'user@example.com',
          password: 'wrong-password',
          workspace: 'test-workspace'
        })
      ).rejects.toThrow('Invalid credentials')
    })

    it('should propagate workspace selection errors', async () => {
      mockAccountClient.selectWorkspace.mockRejectedValue(new Error('Access denied'))

      await expect(
        getWorkspaceToken('https://api.example.com', {
          email: 'user@example.com',
          password: 'password123',
          workspace: 'test-workspace'
        })
      ).rejects.toThrow('Access denied')
    })
  })

  describe('edge cases', () => {
    it('should handle empty workspace name', async () => {
      await getWorkspaceToken('https://api.example.com', {
        token: 'token',
        workspace: ''
      })

      expect(mockAccountClient.selectWorkspace).toHaveBeenCalledWith('')
    })

    it('should handle special characters in credentials', async () => {
      await getWorkspaceToken('https://api.example.com', {
        email: 'user+test@example.com',
        password: 'p@ssw0rd!#$%',
        workspace: 'test-workspace'
      })

      expect(mockAccountClient.login).toHaveBeenCalledWith('user+test@example.com', 'p@ssw0rd!#$%')
    })
  })
})
