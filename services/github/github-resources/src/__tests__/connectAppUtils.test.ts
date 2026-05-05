import { resolveGithubConnectAction } from '../components/connectAppUtils'

describe('resolveGithubConnectAction', () => {
  it('returns installation action for installation callback without oauth code', () => {
    const state = btoa(
      JSON.stringify({
        accountId: 'person-1',
        op: 'installation',
        token: 'token-1',
        workspace: 'workspace-1'
      })
    )

    expect(
      resolveGithubConnectAction({
        path: ['github'],
        query: {
          installation_id: '42',
          setup_action: 'install',
          state
        }
      } as any)
    ).toEqual({
      action: 'installation',
      payload: {
        installationId: 42,
        workspace: 'workspace-1',
        accountId: 'person-1',
        token: 'token-1'
      }
    })
  })

  it('returns authorize action only when oauth code is present', () => {
    const state = btoa(
      JSON.stringify({
        accountId: 'person-2',
        op: 'authorize',
        token: 'token-2',
        workspace: 'workspace-2'
      })
    )

    expect(
      resolveGithubConnectAction({
        path: ['github'],
        query: {
          code: 'oauth-code',
          state
        }
      } as any)
    ).toEqual({
      action: 'authorize',
      payload: {
        code: 'oauth-code',
        state,
        workspace: 'workspace-2',
        accountId: 'person-2'
      }
    })
  })

  it('shows selector when installation callback has no state yet', () => {
    expect(
      resolveGithubConnectAction({
        path: ['github'],
        query: {
          installation_id: '7',
          setup_action: 'install'
        }
      } as any)
    ).toEqual({
      action: 'selector',
      installationId: 7
    })
  })
})
