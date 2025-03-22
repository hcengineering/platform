import type { WorkspaceInfoWithStatus, WorkspaceLoginInfo } from '@hcengineering/account'
import { APIRequestContext } from '@playwright/test'
import { DevUrl, LocalUrl, PlatformURI } from '../utils'

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
      params: { workspaceName }
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
