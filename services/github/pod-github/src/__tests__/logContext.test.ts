import type { PersonId, WorkspaceUuid } from '@hcengineering/core'
import { getInstallationLogContext, getOAuthCallbackLogContext, githubLogErrorCategory } from '../logContext'

const workspace = '00000000-0000-0000-0000-000000000001' as WorkspaceUuid
const accountId = '00000000-0000-0000-0000-000000000002' as PersonId

describe('log contexts', () => {
  it('uses stable categories for credential-related request failures', () => {
    expect(githubLogErrorCategory).toEqual({
      installationMapping: 'installation-mapping-failed',
      oauthCallback: 'oauth-callback-failed'
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
})
