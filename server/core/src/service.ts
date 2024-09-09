//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { type MeasureContext } from '@hcengineering/core'

import { type ServiceAdapter, type ServiceAdapterConfig, type ServiceAdaptersManager } from './types'

export class ServiceAdaptersManagerImpl implements ServiceAdaptersManager {
  constructor (
    private readonly adapters: Map<string, ServiceAdapter>,
    private readonly context: MeasureContext
  ) {}

  getAdapter (adapterId: string): ServiceAdapter | undefined {
    return this.adapters.get(adapterId)
  }

  async close (): Promise<void> {
    for (const adapter of this.adapters.values()) {
      await adapter.close()
    }
  }

  metrics (): MeasureContext {
    return this.context
  }
}

export async function createServiceAdaptersManager (
  serviceAdapters: Record<string, ServiceAdapterConfig>,
  context: MeasureContext
): Promise<ServiceAdaptersManager> {
  const adapters = new Map<string, ServiceAdapter>()

  for (const key in serviceAdapters) {
    const adapterConf = serviceAdapters[key]
    const adapter = await adapterConf.factory(adapterConf.url, adapterConf.db, context.newChild(key, {}))

    adapters.set(key, adapter)
  }
  return new ServiceAdaptersManagerImpl(adapters, context)
}
