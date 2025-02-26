import { APIRequestContext } from '@playwright/test'
import { PlatformURI, LocalUrl, DevUrl } from '../utils'

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
  ): Promise<{
      workspace: string
      workspaceId: string
      workspaceName: string
    }> {
    const token = await this.loginAndGetToken(username, password)
    const url = this.baseUrl
    const payload = {
      method: 'createWorkspace',
      params: { workspaceName }
    }
    const headers = this.getDefaultHeaders(token)
    const response = await this.request.post(url, { data: payload, headers })
    return (await response.json()).result
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
