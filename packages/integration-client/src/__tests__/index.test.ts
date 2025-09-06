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

import * as integrationClient from '../index'

describe('index exports', () => {
  it('should export IntegrationClientImpl from client', () => {
    expect(integrationClient.IntegrationClientImpl).toBeDefined()
    expect(typeof integrationClient.IntegrationClientImpl).toBe('function')
  })

  it('should export getIntegrationClient from client', () => {
    expect(integrationClient.getIntegrationClient).toBeDefined()
    expect(typeof integrationClient.getIntegrationClient).toBe('function')
  })

  it('should export utility functions from utils', () => {
    expect(integrationClient.isWorkspaceIntegration).toBeDefined()
    expect(integrationClient.isConnection).toBeDefined()
    expect(integrationClient.isSameIntegrationEvent).toBeDefined()

    expect(typeof integrationClient.isWorkspaceIntegration).toBe('function')
    expect(typeof integrationClient.isConnection).toBe('function')
    expect(typeof integrationClient.isSameIntegrationEvent).toBe('function')
  })

  it('should export event-related exports from events', () => {
    expect(integrationClient.IntegrationEventEmitter).toBeDefined()
    expect(integrationClient.getIntegrationEventBus).toBeDefined()
    expect(integrationClient.onIntegrationEvent).toBeDefined()

    expect(typeof integrationClient.IntegrationEventEmitter).toBe('function')
    expect(typeof integrationClient.getIntegrationEventBus).toBe('function')
    expect(typeof integrationClient.onIntegrationEvent).toBe('function')
  })

  it('should not export any undefined values', () => {
    const exports = Object.keys(integrationClient)
    exports.forEach((exportName) => {
      expect((integrationClient as any)[exportName]).toBeDefined()
    })
  })
})
