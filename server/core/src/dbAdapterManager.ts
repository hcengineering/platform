//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { Analytics } from '@hcengineering/analytics'
import { DOMAIN_TX, type Domain, type MeasureContext } from '@hcengineering/core'
import { type DbAdapter, type DomainHelper } from './adapter'
import type { DbConfiguration } from './configuration'
import { DummyDbAdapter } from './mem'
import type { DBAdapterManager, PipelineContext } from './types'

interface DomainInfo {
  exists: boolean
  documents: number
}

export class DbAdapterManagerImpl implements DBAdapterManager {
  domainInfo = new Map<Domain, DomainInfo>()

  emptyAdapter = new DummyDbAdapter()

  domainHelper?: DomainHelper

  constructor (
    private readonly metrics: MeasureContext,

    readonly conf: DbConfiguration,
    private readonly context: PipelineContext,
    private readonly defaultAdapter: DbAdapter,
    private readonly adapters: Map<string, DbAdapter>
  ) {}

  reserveContext (id: string): () => void {
    const ops: (() => void)[] = []
    for (const adapter of this.adapters.values()) {
      try {
        if (adapter.reserveContext !== undefined) {
          ops.push(adapter.reserveContext(id))
        }
      } catch (err: any) {
        Analytics.handleError(err)
      }
    }
    return () => {
      for (const op of ops) {
        op()
      }
    }
  }

  getDefaultAdapter (): DbAdapter {
    return this.defaultAdapter
  }

  async registerHelper (ctx: MeasureContext, helper: DomainHelper): Promise<void> {
    this.domainHelper = helper
    await this.initDomains(ctx)
  }

  async initDomains (ctx: MeasureContext): Promise<void> {
    const adapterDomains = new Map<DbAdapter, Set<Domain>>()
    for (const d of this.context.hierarchy.domains()) {
      // We need to init domain info
      await ctx.with('update-info', { domain: d }, async (ctx) => {
        const info = this.getDomainInfo(d)
        await this.updateInfo(d, adapterDomains, info)
      })
    }
    for (const [name, adapter] of this.adapters.entries()) {
      await ctx.with('domain-helper', { name }, async (ctx) => {
        adapter.on?.((domain, event, count, helper) => {
          const info = this.getDomainInfo(domain)
          const oldDocuments = info.documents
          switch (event) {
            case 'add':
              info.documents += count
              break
            case 'update':
              break
            case 'delete':
              info.documents -= count
              break
            case 'read':
              break
          }

          if (oldDocuments < 50 && info.documents > 50) {
            // We have more 50 documents, we need to check for indexes
            void this.domainHelper?.checkDomain(this.metrics, domain, info.documents, helper)
          }
          if (oldDocuments > 50 && info.documents < 50) {
            // We have more 50 documents, we need to check for indexes
            void this.domainHelper?.checkDomain(this.metrics, domain, info.documents, helper)
          }
        })
      })
    }
  }

  async initAdapters (): Promise<void> {
    for (const [key, adapter] of this.adapters) {
      // already initialized
      if (key !== this.conf.domains[DOMAIN_TX] && adapter.init !== undefined) {
        let excludeDomains: string[] | undefined
        let domains: string[] | undefined
        if (this.conf.defaultAdapter === key) {
          excludeDomains = []
          for (const domain in this.conf.domains) {
            if (this.conf.domains[domain] !== key) {
              excludeDomains.push(domain)
            }
          }
        } else {
          domains = []
          for (const domain in this.conf.domains) {
            if (this.conf.domains[domain] === key) {
              domains.push(domain)
            }
          }
        }
        await adapter?.init?.(this.metrics, domains, excludeDomains)
      }
    }
  }

  private async updateInfo (d: Domain, adapterDomains: Map<DbAdapter, Set<Domain>>, info: DomainInfo): Promise<void> {
    const name = this.conf.domains[d] ?? '#default'
    const adapter = this.adapters.get(name) ?? this.defaultAdapter
    if (adapter !== undefined) {
      const h = adapter.helper?.()
      if (h !== undefined) {
        const dbDomains = adapterDomains.get(adapter) ?? (await h.listDomains())
        adapterDomains.set(adapter, dbDomains)
        info.exists = dbDomains.has(d)
        if (info.exists) {
          info.documents = await h.estimatedCount(d)
        }
      } else {
        info.exists = true
      }
    } else {
      info.exists = false
    }
  }

  private getDomainInfo (domain: Domain): DomainInfo {
    let info = this.domainInfo.get(domain)
    if (info === undefined) {
      info = {
        documents: 0,
        exists: true
      }
      this.domainInfo.set(domain, info)
    }
    return info
  }

  async close (): Promise<void> {
    for (const o of this.adapters.values()) {
      try {
        await o.close()
      } catch (err: any) {
        Analytics.handleError(err)
      }
    }
  }

  getAdapterName (domain: Domain): string {
    const adapterName = this.conf.domains[domain]
    return adapterName ?? this.conf.defaultAdapter
  }

  getAdapterByName (name: string): DbAdapter {
    if (name === this.conf.defaultAdapter) {
      return this.defaultAdapter
    }
    const adapter = this.adapters.get(name) ?? this.defaultAdapter
    if (adapter === undefined) {
      throw new Error('adapter not provided: ' + name)
    }

    return adapter
  }

  public getAdapter (domain: Domain, requireExists: boolean): DbAdapter {
    const name = this.conf.domains[domain] ?? '#default'
    const adapter = this.adapters.get(name) ?? this.defaultAdapter
    if (adapter === undefined) {
      throw new Error('adapter not provided: ' + name)
    }

    const info = this.getDomainInfo(domain)

    if (!info.exists && !requireExists) {
      return this.emptyAdapter
    }
    // If we require it exists, it will be exists
    info.exists = true

    return adapter
  }
}
