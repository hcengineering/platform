import type { PersonId, WorkspaceUuid } from '@hcengineering/core'

jest.mock('@hcengineering/analytics', () => ({
  Analytics: {
    handleError: jest.fn()
  }
}))

import { Analytics } from '@hcengineering/analytics'
import {
  getInstallationLogContext,
  getOAuthCallbackLogContext,
  githubLogErrorCategory,
  reportGithubCredentialError
} from '../logContext'

const workspace = '00000000-0000-0000-0000-000000000001' as WorkspaceUuid
const accountId = '00000000-0000-0000-0000-000000000002' as PersonId

describe('log contexts', () => {
  it('uses stable categories for credential-related request failures', () => {
    expect(githubLogErrorCategory).toEqual({
      installationMapping: 'installation-mapping-failed',
      installationRemoval: 'installation-removal-failed',
      oauthCallback: 'oauth-callback-failed',
      oauthExchange: 'oauth-exchange-failed',
      oauthTokenRefresh: 'oauth-token-refresh-failed'
    })
  })

  it('contains only non-secret installation identifiers', () => {
    const context = getInstallationLogContext(workspace, accountId, 123)

    expect(context).toEqual({ workspace, accountId, installationId: 123 })
    for (const secretField of ['token', 'code', 'state', 'secret']) {
      expect(context).not.toHaveProperty(secretField)
    }
  })

  it('contains only non-secret OAuth callback identifiers', () => {
    const context = getOAuthCallbackLogContext(workspace, accountId)

    expect(context).toEqual({ workspace, accountId })
    for (const secretField of ['token', 'code', 'state', 'secret']) {
      expect(context).not.toHaveProperty(secretField)
    }
  })

  it('reports credential-bearing request failures with fresh, credential-free errors', () => {
    const clientSecret = 'client-secret-value'
    const code = 'oauth-code-value'
    const state = 'oauth-state-value'
    const token = 'installation-token-value'
    const original = Object.assign(
      new Error(
        `https://github.com/login/oauth/access_token?client_secret=${clientSecret}&code=${code}&state=${state}`
      ),
      { cause: new Error(`token=${token}`) }
    )
    const logger = { error: jest.fn() }

    try {
      throw original
    } catch {
      reportGithubCredentialError(
        logger,
        'failed to request github access token',
        githubLogErrorCategory.oauthCallback
      )
    }

    const analyticsError = (Analytics.handleError as jest.Mock).mock.calls[0][0] as Error
    const loggerArguments = logger.error.mock.calls[0]
    const serializedSinks = serializeWithErrorDetails([analyticsError, loggerArguments])

    expect(Analytics.handleError).toHaveBeenCalledWith(analyticsError)
    expect(logger.error).toHaveBeenCalledWith('failed to request github access token', {
      error: githubLogErrorCategory.oauthCallback
    })
    expect(analyticsError).not.toBe(original)
    expect(analyticsError.message).toBe(githubLogErrorCategory.oauthCallback)
    expect(analyticsError).not.toHaveProperty('cause')
    expect(analyticsError.stack).not.toContain(clientSecret)
    expect(analyticsError.stack).not.toContain(code)
    expect(analyticsError.stack).not.toContain(state)
    expect(analyticsError.stack).not.toContain(token)
    expect(serializedSinks).not.toContain(clientSecret)
    expect(serializedSinks).not.toContain(code)
    expect(serializedSinks).not.toContain(state)
    expect(serializedSinks).not.toContain(token)
  })
})

function serializeWithErrorDetails (value: unknown): string {
  return JSON.stringify(value, (_key, item) => {
    if (item instanceof Error) {
      return Object.fromEntries(Object.getOwnPropertyNames(item).map((name) => [name, item[name as keyof Error]]))
    }
    return item
  })
}
