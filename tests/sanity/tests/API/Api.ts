import type { WorkspaceInfoWithStatus, WorkspaceLoginInfo } from '@hcengineering/account'
import type { AccountRole } from '@hcengineering/core'
import { APIRequestContext } from '@playwright/test'
import { DevUrl, LocalUrl, PlatformURI, PlatformWorkspaceRegion } from '../utils'

export class ApiEndpoint {
  private readonly request: APIRequestContext
  private readonly baseUrl: string

  constructor (request: APIRequestContext) {
    this.request = request
    this.baseUrl = typeof DevUrl === 'string' && DevUrl.trim() !== '' ? DevUrl : LocalUrl
  }

  private getDefaultHeaders (token: string = ''): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Origin: PlatformURI,
      Referer: PlatformURI
    }
    if (token !== '') {
      headers.Authorization = `Bearer ${token}`
    }
    return headers
  }

  private async loginAndGetToken (email: string, password: string): Promise<string> {
    const loginUrl = this.baseUrl
    const loginPayload = {
      method: 'login',
      params: { email, password }
    }
    const headers = {
      'Content-Type': 'application/json',
      Origin: PlatformURI,
      Referer: PlatformURI
    }
    const response = await this.request.post(loginUrl, { data: loginPayload, headers })
    if (response.status() !== 200) {
      throw new Error(`Login failed with status: ${response.status()}`)
    }
    const token = (await response.json()).result.token
    return token
  }

  async createWorkspaceWithLogin (
    workspaceName: string,
    username: string,
    password: string
  ): Promise<WorkspaceLoginInfo> {
    const token = await this.loginAndGetToken(username, password)
    const url = this.baseUrl
    const payload = {
      method: 'createWorkspace',
      params: { workspaceName, region: PlatformWorkspaceRegion }
    }
    const headers = this.getDefaultHeaders(token)
    const response = await this.request.post(url, { data: payload, headers })

    const wsResult: WorkspaceLoginInfo = (await response.json()).result

    await this.waitWorkspaceReady(token, wsResult.workspaceUrl)

    return wsResult
  }

  async waitWorkspaceReady (token: string, workspaceUrl: string): Promise<void> {
    // We need to wait for workspace to be created before we will continue.
    const headers = this.getDefaultHeaders(token)
    const url = this.baseUrl
    const selectWorkspaceResponse: WorkspaceLoginInfo = (
      await (
        await this.request.post(url, {
          data: {
            method: 'selectWorkspace',
            params: { workspaceUrl }
          },
          headers
        })
      ).json()
    ).result

    const wsToken = selectWorkspaceResponse.token
    if (wsToken === undefined) {
      throw new Error('Workspace token is undefined')
    }

    const headersInfo = this.getDefaultHeaders(wsToken)
    while (true) {
      const wsInfo: WorkspaceInfoWithStatus = (
        await (
          await this.request.post(url, {
            data: {
              method: 'getWorkspaceInfo',
              params: { updateLastVisit: false }
            },
            headers: headersInfo
          })
        ).json()
      ).result
      await new Promise((resolve) => setTimeout(resolve, 1000))
      if (wsInfo.status.mode === 'active') {
        break
      }
    }
  }

  async createAccount (email: string, password: string, firstName: string, lastName: string): Promise<any> {
    const url = this.baseUrl
    const payload = {
      method: 'signUp',
      params: { email, password, firstName, lastName }
    }
    const headers = this.getDefaultHeaders()
    const response = await this.request.post(url, { data: payload, headers })
    return await response.json()
  }

  /**
   * Logs in and selects the workspace: the result carries the workspace token, uuid and transactor endpoint.
   */
  async getWorkspaceLoginInfo (
    email: string,
    password: string,
    workspaceUrl: string
  ): Promise<WorkspaceLoginInfo & { token: string }> {
    const accountToken = await this.loginAndGetToken(email, password)
    const response = await this.request.post(this.baseUrl, {
      data: { method: 'selectWorkspace', params: { workspaceUrl } },
      headers: this.getDefaultHeaders(accountToken)
    })
    const info: WorkspaceLoginInfo | undefined = (await response.json()).result
    const token = info?.token
    if (info === undefined || token === undefined) {
      throw new Error(`Failed to select workspace ${workspaceUrl}`)
    }
    return { ...info, token }
  }

  /**
   * Logs in as the shared anonymous guest account (the "Continue as a guest" link) and selects the workspace.
   * Fails when the workspace does not allow anonymous guests.
   */
  async getAnonymousWorkspaceLoginInfo (workspaceUrl: string): Promise<WorkspaceLoginInfo & { token: string }> {
    const loginResponse = await this.request.post(this.baseUrl, {
      data: { method: 'loginAsGuest', params: {} },
      headers: this.getDefaultHeaders()
    })
    const guestToken: string | undefined = (await loginResponse.json()).result?.token
    if (guestToken === undefined) {
      throw new Error('Failed to log in as an anonymous guest')
    }
    const response = await this.request.post(this.baseUrl, {
      data: { method: 'selectWorkspace', params: { workspaceUrl } },
      headers: this.getDefaultHeaders(guestToken)
    })
    const body = await response.json()
    const info: WorkspaceLoginInfo | undefined = body.result
    const token = info?.token
    if (info === undefined || token === undefined) {
      throw new Error(
        `Anonymous guest failed to select workspace ${workspaceUrl}: ${JSON.stringify(body.error ?? body)}`
      )
    }
    return { ...info, token }
  }

  /**
   * Turns anonymous (read-only) guest access to the workspace on or off. Needs the workspace Owner.
   * Note: turning it on through the API does not create the Employee of the anonymous guest, the settings UI does.
   */
  async setAllowReadOnlyGuests (
    email: string,
    password: string,
    workspaceUrl: string,
    readOnlyGuestsAllowed: boolean
  ): Promise<void> {
    const wsToken = await this.getWorkspaceToken(email, password, workspaceUrl)
    const response = await this.request.post(this.baseUrl, {
      data: { method: 'updateAllowReadOnlyGuests', params: { readOnlyGuestsAllowed } },
      headers: this.getDefaultHeaders(wsToken)
    })
    const body = await response.json()
    if (body.error !== undefined) {
      throw new Error(`Failed to update anonymous guest access: ${JSON.stringify(body.error)}`)
    }
  }

  private async getWorkspaceToken (email: string, password: string, workspaceUrl: string): Promise<string> {
    return (await this.getWorkspaceLoginInfo(email, password, workspaceUrl)).token
  }

  /**
   * Creates a single-use invite to the workspace with the given role and returns its id.
   */
  async createWorkspaceInvite (
    email: string,
    password: string,
    workspaceUrl: string,
    role: AccountRole
  ): Promise<string> {
    const wsToken = await this.getWorkspaceToken(email, password, workspaceUrl)
    const response = await this.request.post(this.baseUrl, {
      data: { method: 'createInvite', params: { exp: -1, emailMask: '', limit: 1, role } },
      headers: this.getDefaultHeaders(wsToken)
    })
    const body = await response.json()
    if (typeof body.result !== 'string') {
      throw new Error(`Failed to create invite: ${JSON.stringify(body.error ?? body)}`)
    }
    return body.result
  }

  /**
   * Joins an existing account to the workspace by invite id.
   */
  async joinWorkspace (email: string, password: string, inviteId: string, workspaceUrl: string): Promise<void> {
    const response = await this.request.post(this.baseUrl, {
      data: { method: 'join', params: { email, password, inviteId, workspaceUrl } },
      headers: this.getDefaultHeaders()
    })
    const body = await response.json()
    if (body.error !== undefined) {
      throw new Error(`Failed to join workspace: ${JSON.stringify(body.error)}`)
    }
  }

  async leaveWorkspace (account: string, username: string, password: string): Promise<any> {
    const token = await this.loginAndGetToken(username, password)
    const url = this.baseUrl
    const payload = {
      method: 'leaveWorkspace',
      params: { account }
    }
    const headers = this.getDefaultHeaders(token)
    const response = await this.request.post(url, { data: payload, headers })
    return await response.json()
  }
}
