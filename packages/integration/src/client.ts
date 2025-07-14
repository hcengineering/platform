//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { IntegrationKind, WorkspaceUuid } from '@hcengineering/core'
import {
  IntegrationClient,
  ActionResponse,
  IntegrationConfig,
  IntegrationInfo,
  ActionRequest,
  ConnectionError,
  ConfigurationError,
  DisconnectionError,
  IntegrationError
} from './types'

export interface HttpClientOptions {
  timeout?: number
  headers?: Record<string, string>
  retries?: number
}

/**
 * Abstract base client for integration services
 * Provides common HTTP operations and error handling
 */
export abstract class AbstractIntegrationClient implements IntegrationClient {
  protected readonly baseUrl: string
  protected readonly options: HttpClientOptions

  constructor (
    baseUrl: string,
    protected readonly integrationKind: IntegrationKind,
    options: HttpClientOptions = {}
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
    this.options = {
      timeout: 30000,
      retries: 3,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      ...options
    }
  }

  getIntegrationKind (): IntegrationKind {
    return this.integrationKind
  }

  /**
   * Make HTTP request with error handling and retries
   */
  protected async makeRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    params?: Record<string, string>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`)

    // Add query parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    }

    const requestOptions: RequestInit = {
      method,
      headers: this.options.headers,
      signal: AbortSignal.timeout(this.options.timeout!)
    }

    if (data && (method === 'POST' || method === 'PUT')) {
      requestOptions.body = JSON.stringify(data)
    }

    let lastError: Error

    for (let attempt = 0; attempt <= this.options.retries!; attempt++) {
      try {
        const response = await fetch(url.toString(), requestOptions)

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          return await response.json()
        }

        return {} as T
      } catch (error) {
        lastError = error as Error

        // Don't retry on client errors (4xx)
        if (error instanceof Error && error.message.includes('HTTP 4')) {
          break
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.options.retries!) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        }
      }
    }

    throw lastError!
  }

  /**
   * Handle errors and convert to appropriate integration error types
   */
  protected handleError (error: Error, workspace: WorkspaceUuid, integrationId: string, operation: string): never {
    const message = `${operation} failed: ${error.message}`

    if (error.message.includes('timeout') || error.message.includes('network')) {
      throw new ConnectionError(message, integrationId, workspace)
    }

    if (error.message.includes('HTTP 400') || error.message.includes('validation')) {
      throw new ConfigurationError(message, integrationId, workspace)
    }

    if (error.message.includes('HTTP 401') || error.message.includes('unauthorized')) {
      throw new ConnectionError(`Authentication failed: ${error.message}`, integrationId, workspace)
    }

    throw new IntegrationError(message, 'UNKNOWN_ERROR', integrationId, workspace)
  }

  async connect (workspace: WorkspaceUuid, integrationId: string, config?: IntegrationConfig): Promise<ActionResponse> {
    try {
      const response = await this.makeRequest<ActionResponse>('POST', '/connect', {
        workspace,
        integrationId,
        config
      })

      return response
    } catch (error) {
      this.handleError(error as Error, workspace, integrationId, 'Connect')
    }
  }

  async disconnect (workspace: WorkspaceUuid, integrationId: string, force?: boolean): Promise<ActionResponse> {
    try {
      const response = await this.makeRequest<ActionResponse>('POST', '/disconnect', {
        workspace,
        integrationId,
        force
      })

      return response
    } catch (error) {
      if (force) {
        // For force disconnect, return success even if cleanup fails
        return {
          success: true,
          status: 'inactive',
          data: { forced: true, error: (error as Error).message }
        }
      }

      throw new DisconnectionError((error as Error).message, integrationId, workspace)
    }
  }

  async reconnect (workspace: WorkspaceUuid, integrationId: string): Promise<ActionResponse> {
    try {
      const response = await this.makeRequest<ActionResponse>('POST', '/reconnect', {
        workspace,
        integrationId
      })

      return response
    } catch (error) {
      this.handleError(error as Error, workspace, integrationId, 'Reconnect')
    }
  }

  async configure (
    workspace: WorkspaceUuid,
    integrationId: string,
    config: Partial<IntegrationConfig>
  ): Promise<ActionResponse> {
    try {
      const response = await this.makeRequest<ActionResponse>('POST', '/configure', {
        workspace,
        integrationId,
        config
      })

      return response
    } catch (error) {
      this.handleError(error as Error, workspace, integrationId, 'Configure')
    }
  }

  async test (workspace: WorkspaceUuid, integrationId: string): Promise<ActionResponse> {
    try {
      const response = await this.makeRequest<ActionResponse>('GET', '/test', undefined, {
        workspace,
        integrationId
      })

      return response
    } catch (error) {
      this.handleError(error as Error, workspace, integrationId, 'Test')
    }
  }

  async getInfo (workspace: WorkspaceUuid, integrationId: string): Promise<IntegrationInfo | null> {
    try {
      const response = await this.makeRequest<IntegrationInfo>('GET', '/info', undefined, {
        workspace,
        integrationId
      })

      return response
    } catch (error) {
      if ((error as Error).message.includes('HTTP 404')) {
        return null
      }
      this.handleError(error as Error, workspace, integrationId, 'Get info')
    }
  }

  async delete (workspace: WorkspaceUuid, integrationId: string, cleanup?: boolean): Promise<ActionResponse> {
    try {
      const response = await this.makeRequest<ActionResponse>('DELETE', '/delete', {
        workspace,
        integrationId,
        cleanup
      })

      return response
    } catch (error) {
      this.handleError(error as Error, workspace, integrationId, 'Delete')
    }
  }

  async setEnabled (workspace: WorkspaceUuid, integrationId: string, enabled: boolean): Promise<ActionResponse> {
    try {
      const response = await this.makeRequest<ActionResponse>('PUT', '/enabled', {
        workspace,
        integrationId,
        enabled
      })

      return response
    } catch (error) {
      this.handleError(error as Error, workspace, integrationId, 'Set enabled')
    }
  }

  async executeAction (workspace: WorkspaceUuid, integrationId: string, action: ActionRequest): Promise<ActionResponse> {
    try {
      const response = await this.makeRequest<ActionResponse>('POST', '/action', {
        workspace,
        integrationId,
        ...action
      })

      return response
    } catch (error) {
      this.handleError(error as Error, workspace, integrationId, `Execute action ${action.type}`)
    }
  }

  /**
   * Hook for subclasses to customize request headers
   */
  protected getAuthHeaders (workspace: WorkspaceUuid, integrationId: string): Record<string, string> {
    return {}
  }

  /**
   * Hook for subclasses to preprocess requests
   */
  protected preprocessRequest (endpoint: string, data?: any): any {
    return data
  }

  /**
   * Hook for subclasses to postprocess responses
   */
  protected postprocessResponse<T>(response: T): T {
    return response
  }
}
