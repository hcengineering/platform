/**

Copyright © 2026 TraceX SAS.

Licensed under the PolyForm Shield License 1.0.0 (the "License");
you may not use this file except in compliance with the License. You may
obtain a copy of the License at https://polyformproject.org/licenses/shield/1.0.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

See the License for the specific language governing permissions and
limitations under the License.
*/

import type { WorkspaceLoginInfo } from '@hcengineering/account'
import {
  type Account,
  type Class,
  type Doc,
  type DocumentQuery,
  type Ref,
  type Tx,
  TxFactory
} from '@hcengineering/core'
import { type APIRequestContext } from '@playwright/test'
import { ApiEndpoint } from './Api'

export interface TxResponse {
  ok: boolean
  status: number
  /** Error text of a rejected tx, e.g. `ERROR: platform:status:Forbidden {}`. */
  error?: string
}

/**
 * Talks to the transactor REST API on behalf of one account, bypassing the UI.
 * Lets tests check what the server itself allows, not only what the UI shows.
 */
export class WorkspaceRestClient {
  private constructor (
    private readonly request: APIRequestContext,
    private readonly endpoint: string,
    private readonly workspace: string,
    private readonly token: string,
    readonly account: Account,
    readonly factory: TxFactory
  ) {}

  static async connect (
    request: APIRequestContext,
    email: string,
    password: string,
    workspaceUrl: string
  ): Promise<WorkspaceRestClient> {
    const info = await new ApiEndpoint(request).getWorkspaceLoginInfo(email, password, workspaceUrl)
    return await WorkspaceRestClient.connectWithLoginInfo(request, info, email)
  }

  /**
   * Connects as the shared anonymous guest account, the same way the "Continue as a guest" link does.
   */
  static async connectAnonymous (request: APIRequestContext, workspaceUrl: string): Promise<WorkspaceRestClient> {
    const info = await new ApiEndpoint(request).getAnonymousWorkspaceLoginInfo(workspaceUrl)
    return await WorkspaceRestClient.connectWithLoginInfo(request, info, 'anonymous guest')
  }

  private static async connectWithLoginInfo (
    request: APIRequestContext,
    info: WorkspaceLoginInfo & { token: string },
    who: string
  ): Promise<WorkspaceRestClient> {
    // Same conversion as the platform REST client: ws://host -> http://host, wss://host -> https://host.
    const endpoint = info.endpoint.replace(/^ws/, 'http').replace(/\/$/, '')
    const response = await request.get(`${endpoint}/api/v1/account/${info.workspace}`, {
      headers: WorkspaceRestClient.headers(info.token)
    })
    if (!response.ok()) {
      throw new Error(`Failed to get account of ${who}: ${response.status()} ${await response.text()}`)
    }
    const account: Account = await response.json()
    return new WorkspaceRestClient(
      request,
      endpoint,
      info.workspace,
      info.token,
      account,
      new TxFactory(account.primarySocialId)
    )
  }

  private static headers (token: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'accept-encoding': 'gzip'
    }
  }

  async findAll<T extends Doc>(_class: Ref<Class<T>>, query: DocumentQuery<T>): Promise<T[]> {
    const response = await this.request.post(`${this.endpoint}/api/v1/find-all/${this.workspace}`, {
      headers: WorkspaceRestClient.headers(this.token),
      data: { _class, query, options: {} }
    })
    if (!response.ok()) {
      throw new Error(`findAll ${_class} failed: ${response.status()} ${await response.text()}`)
    }
    const body = await response.json()
    // Results with a total are sent as { dataType: 'TotalArray', value: [...] }.
    return Array.isArray(body) ? body : (body.value ?? [])
  }

  async findOne<T extends Doc>(_class: Ref<Class<T>>, query: DocumentQuery<T>): Promise<T | undefined> {
    return (await this.findAll(_class, query))[0]
  }

  /**
   * Sends a tx and reports the outcome instead of throwing, so tests can assert rejections.
   */
  async tx (tx: Tx): Promise<TxResponse> {
    const response = await this.request.post(`${this.endpoint}/api/v1/tx/${this.workspace}`, {
      headers: WorkspaceRestClient.headers(this.token),
      data: tx
    })
    if (response.ok()) {
      return { ok: true, status: response.status() }
    }
    const text = await response.text()
    let error = text
    try {
      const body = JSON.parse(text)
      error = typeof body.error === 'string' ? body.error : JSON.stringify(body.error ?? body)
    } catch {
      // Not JSON: keep the raw text.
    }
    return { ok: false, status: response.status(), error }
  }
}
