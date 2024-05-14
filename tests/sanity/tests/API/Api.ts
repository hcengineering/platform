import { APIRequestContext } from '@playwright/test'
import { PlatformURI, AccountUrl } from '../utils'

export class ApiEndpoint {
  private readonly request: APIRequestContext

  constructor (request: APIRequestContext) {
    this.request = request
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

  private async loginAndGetToken (username: string, password: string): Promise<string> {
    const loginUrl = AccountUrl
    const loginPayload = {
      method: 'login',
      params: [username, password]
    }
    const headers = {
      'Content-Type': 'application/json',
      Origin: PlatformURI,
      Referer: PlatformURI
    }
    const response = await this.request.post(loginUrl, { data: loginPayload, headers })
    const token = (await response.json()).result.token
    return token
  }

  async createWorkspaceWithLogin (workspaceName: string, username: string, password: string): Promise<any> {
    const token = await this.loginAndGetToken(username, password)
    const url = AccountUrl
    const payload = {
      method: 'createWorkspace',
      params: [workspaceName]
    }
    const headers = this.getDefaultHeaders(token)
    const response = await this.request.post(url, { data: payload, headers })
    return await response.json()
  }

  async createAccount (username: string, password: string, firstName: string, lastName: string): Promise<any> {
    const url = AccountUrl
    const payload = {
      method: 'createAccount',
      params: [username, password, firstName, lastName]
    }
    const headers = this.getDefaultHeaders()
    const response = await this.request.post(url, { data: payload, headers })
    return await response.json()
  }
}
