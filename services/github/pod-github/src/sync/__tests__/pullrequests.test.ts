/* eslint-disable import/first */
import { PersonId } from '@hcengineering/core'
import { PullRequestExternalData } from '../githubTypes'
import type { UserInfo } from '../../types'

// Mock dependencies before imports
jest.mock('@octokit/webhooks-types', () => ({}), { virtual: true })
jest.mock('octokit', () => ({}), { virtual: true })
jest.mock('../../config', () => ({
  default: {
    AccountsURL: 'http://localhost:3000',
    ServerSecret: 'test-secret',
    AppId: 'test-app-id',
    ClientId: 'test-client-id',
    ClientSecret: 'test-client-secret',
    PrivateKey: 'test-private-key',
    CollaboratorURL: 'http://localhost:3078',
    BotName: 'test-bot'
  }
}))

import { PullRequestSyncManager } from '../pullrequests'
/* eslint-enable import/first */

describe('PullRequestSyncManager', () => {
  describe('getReviewers', () => {
    let manager: PullRequestSyncManager
    let mockProvider: any

    beforeEach(async () => {
      mockProvider = {
        getAccount: jest.fn()
      }
      manager = new PullRequestSyncManager(null as any, null as any, null as any)
      await manager.init(mockProvider)
    })

    it('should handle null reviewRequests gracefully', async () => {
      const prData: Partial<PullRequestExternalData> = {
        reviewRequests: null as any,
        latestReviews: { nodes: [] }
      }

      const result = await manager.getReviewers(prData as PullRequestExternalData)

      expect(result).toEqual([])
      expect(mockProvider.getAccount).not.toHaveBeenCalled()
    })

    it('should handle undefined reviewRequests gracefully', async () => {
      const prData: Partial<PullRequestExternalData> = {
        reviewRequests: undefined as any,
        latestReviews: { nodes: [] }
      }

      const result = await manager.getReviewers(prData as PullRequestExternalData)

      expect(result).toEqual([])
      expect(mockProvider.getAccount).not.toHaveBeenCalled()
    })

    it('should handle null items in reviewRequests.nodes', async () => {
      const user1: UserInfo = { id: 'user1', login: 'user1' }
      const user2: UserInfo = { id: 'user2', login: 'user2' }
      const prData: Partial<PullRequestExternalData> = {
        reviewRequests: {
          nodes: [null, { requestedReviewer: user1 }, null, { requestedReviewer: user2 }] as any
        },
        latestReviews: { nodes: [] }
      }

      mockProvider.getAccount.mockImplementation((user: UserInfo) => {
        return Promise.resolve(user.id as PersonId)
      })

      const result = await manager.getReviewers(prData as PullRequestExternalData)

      expect(result).toEqual(['user1', 'user2'])
      expect(mockProvider.getAccount).toHaveBeenCalledTimes(2)
    })

    it('should handle null requestedReviewer in nodes', async () => {
      const user1: UserInfo = { id: 'user1', login: 'user1' }
      const prData: Partial<PullRequestExternalData> = {
        reviewRequests: {
          nodes: [{ requestedReviewer: null }, { requestedReviewer: user1 }, { requestedReviewer: null }] as any
        },
        latestReviews: { nodes: [] }
      }

      mockProvider.getAccount.mockImplementation((user: UserInfo) => {
        return Promise.resolve(user.id as PersonId)
      })

      const result = await manager.getReviewers(prData as PullRequestExternalData)

      expect(result).toEqual(['user1'])
      expect(mockProvider.getAccount).toHaveBeenCalledTimes(1)
    })

    it('should filter out reviewers when getAccount returns undefined', async () => {
      const user1: UserInfo = { id: 'user1', login: 'user1' }
      const user2: UserInfo = { id: 'user2', login: 'user2' }
      const user3: UserInfo = { id: 'user3', login: 'user3' }
      const prData: Partial<PullRequestExternalData> = {
        reviewRequests: {
          nodes: [{ requestedReviewer: user1 }, { requestedReviewer: user2 }, { requestedReviewer: user3 }] as any
        },
        latestReviews: { nodes: [] }
      }

      mockProvider.getAccount.mockImplementation((user: UserInfo) => {
        if (user.id === 'user2') {
          return Promise.resolve(undefined)
        }
        return Promise.resolve(user.id as PersonId)
      })

      const result = await manager.getReviewers(prData as PullRequestExternalData)

      expect(result).toEqual(['user1', 'user3'])
      expect(mockProvider.getAccount).toHaveBeenCalledTimes(3)
    })

    it('should handle null latestReviews', async () => {
      const prData: Partial<PullRequestExternalData> = {
        reviewRequests: { nodes: [] },
        latestReviews: null as any
      }

      const result = await manager.getReviewers(prData as PullRequestExternalData)

      expect(result).toEqual([])
      expect(mockProvider.getAccount).not.toHaveBeenCalled()
    })

    it('should handle undefined latestReviews', async () => {
      const prData: Partial<PullRequestExternalData> = {
        reviewRequests: { nodes: [] },
        latestReviews: undefined as any
      }

      const result = await manager.getReviewers(prData as PullRequestExternalData)

      expect(result).toEqual([])
      expect(mockProvider.getAccount).not.toHaveBeenCalled()
    })

    it('should skip reviews with null author', async () => {
      const user1: UserInfo = { id: 'user1', login: 'user1' }
      const prData: Partial<PullRequestExternalData> = {
        reviewRequests: { nodes: [] },
        latestReviews: {
          nodes: [
            { author: null, state: 'APPROVED' } as any,
            { author: user1, state: 'APPROVED' } as any,
            { author: null, state: 'CHANGES_REQUESTED' } as any
          ]
        }
      }

      mockProvider.getAccount.mockImplementation((user: UserInfo) => {
        return Promise.resolve(user.id as PersonId)
      })

      const result = await manager.getReviewers(prData as PullRequestExternalData)

      expect(result).toEqual(['user1'])
      expect(mockProvider.getAccount).toHaveBeenCalledTimes(1)
    })

    it('should combine reviewRequests and latestReviews', async () => {
      const user1: UserInfo = { id: 'user1', login: 'user1' }
      const user2: UserInfo = { id: 'user2', login: 'user2' }
      const user3: UserInfo = { id: 'user3', login: 'user3' }
      const user4: UserInfo = { id: 'user4', login: 'user4' }
      const prData: Partial<PullRequestExternalData> = {
        reviewRequests: {
          nodes: [{ requestedReviewer: user1 }, { requestedReviewer: user2 }] as any
        },
        latestReviews: {
          nodes: [{ author: user3, state: 'APPROVED' } as any, { author: user4, state: 'CHANGES_REQUESTED' } as any]
        }
      }

      mockProvider.getAccount.mockImplementation((user: UserInfo) => {
        return Promise.resolve(user.id as PersonId)
      })

      const result = await manager.getReviewers(prData as PullRequestExternalData)

      expect(result).toEqual(['user1', 'user2', 'user3', 'user4'])
      expect(mockProvider.getAccount).toHaveBeenCalledTimes(4)
    })

    it('should handle complex null cases', async () => {
      const user1: UserInfo = { id: 'user1', login: 'user1' }
      const user2: UserInfo = { id: 'user2', login: 'user2' }
      const prData: Partial<PullRequestExternalData> = {
        reviewRequests: {
          nodes: [null, { requestedReviewer: null }, { requestedReviewer: user1 }, null] as any
        },
        latestReviews: {
          nodes: [null as any, { author: null, state: 'APPROVED' } as any, { author: user2, state: 'APPROVED' } as any]
        }
      }

      mockProvider.getAccount.mockImplementation((user: UserInfo) => {
        return Promise.resolve(user.id as PersonId)
      })

      const result = await manager.getReviewers(prData as PullRequestExternalData)

      expect(result).toEqual(['user1', 'user2'])
      expect(mockProvider.getAccount).toHaveBeenCalledTimes(2)
    })

    it('should handle empty arrays', async () => {
      const prData: Partial<PullRequestExternalData> = {
        reviewRequests: { nodes: [] },
        latestReviews: { nodes: [] }
      }

      const result = await manager.getReviewers(prData as PullRequestExternalData)

      expect(result).toEqual([])
      expect(mockProvider.getAccount).not.toHaveBeenCalled()
    })
  })
})
