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

import { type MeasureContext, PersonId, PersonUuid, SocialIdType, WorkspaceUuid } from '@hcengineering/core'
import { type RestClient } from '@hcengineering/api-client'
import { EmailContact } from './types'

export interface CachedPerson {
  socialId: PersonId
  uuid: PersonUuid
  localPerson: string
}

/**
 * Caches persons to reduce ensure person API calls
 */
export class PersonCache {
  private readonly cache = new Map<string, Promise<CachedPerson | undefined>>()

  constructor (
    private readonly ctx: MeasureContext,
    private readonly restClient: RestClient
  ) {}

  /**
   * Gets or creates a person by email address with caching
   */
  async ensurePerson (contact: EmailContact): Promise<CachedPerson> {
    const email = contact.email.toLowerCase().trim()

    let personPromise = this.cache.get(email)

    if (personPromise === undefined) {
      personPromise = this.fetchAndCachePerson(email, contact.firstName, contact.lastName)
      this.cache.set(email, personPromise)
    }

    const result = await personPromise
    if (result === undefined) {
      throw new Error(`Failed to ensure person exists for email: ${email}`)
    }
    return result
  }

  size (): number {
    return this.cache.size
  }

  clearCache (): void {
    this.cache.clear()
  }

  private async fetchAndCachePerson (
    email: string,
    firstName: string,
    lastName: string
  ): Promise<CachedPerson | undefined> {
    try {
      const result = await this.restClient.ensurePerson(SocialIdType.EMAIL, email, firstName, lastName)

      if (result === undefined) {
        this.ctx.warn('Failed to ensure person exists', { email })
        return undefined
      }

      return result
    } catch (err) {
      this.ctx.error('Error ensuring person exists', {
        email,
        firstName,
        lastName,
        error: err instanceof Error ? err.message : String(err)
      })

      this.cache.delete(email)

      throw err
    }
  }
}

/**
 * Factory for creating and managing PersonCache instances per workspace
 */
export const PersonCacheFactory = {
  instances: new Map<WorkspaceUuid, PersonCache>(),

  getInstance (ctx: MeasureContext, restClient: RestClient, workspace: WorkspaceUuid): PersonCache {
    let instance = PersonCacheFactory.instances.get(workspace)

    if (instance === undefined) {
      instance = new PersonCache(ctx, restClient)
      PersonCacheFactory.instances.set(workspace, instance)
    }

    return instance
  },

  resetInstance (workspace: WorkspaceUuid): void {
    PersonCacheFactory.instances.delete(workspace)
  },

  resetAllInstances (): void {
    PersonCacheFactory.instances.clear()
  },

  get instanceCount (): number {
    return PersonCacheFactory.instances.size
  }
}
