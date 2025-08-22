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

import { MeasureContext, PersonUuid, Space, TxOperations, WorkspaceUuid } from '@hcengineering/core'
import contact, { PersonSpace } from '@hcengineering/contact'

/**
 * Cache for person spaces
 */
export class PersonSpacesCache {
  private readonly cache = new Map<PersonUuid, Promise<PersonSpace[]>>()

  constructor (
    private readonly ctx: MeasureContext,
    private readonly client: TxOperations,
    private readonly workspace: WorkspaceUuid
  ) {}

  async getPersonSpaces (mailId: string, personUuid: PersonUuid, email: string): Promise<Space[]> {
    let spacesPromise = this.cache.get(personUuid)

    if (spacesPromise === undefined) {
      spacesPromise = this.fetchPersonSpaces(mailId, personUuid, email)
      this.cache.set(personUuid, spacesPromise)
    }

    return await spacesPromise
  }

  clearPersonCache (personUuid: PersonUuid): void {
    this.cache.delete(personUuid)
  }

  clearCache (): void {
    this.cache.clear()
  }

  get size (): number {
    return this.cache.size
  }

  private async fetchPersonSpaces (mailId: string, personUuid: PersonUuid, email: string): Promise<PersonSpace[]> {
    try {
      const persons = await this.client.findAll(contact.class.Person, { personUuid }, { projection: { _id: 1 } })

      const personRefs = persons.map((p) => p._id)
      const spaces = await this.client.findAll(contact.class.PersonSpace, { person: { $in: personRefs } })

      if (spaces.length === 0) {
        this.ctx.warn('No personal space found, skip', { mailId, personUuid, email, workspace: this.workspace })
      }

      return spaces
    } catch (err) {
      this.ctx.error('Error fetching person spaces', {
        mailId,
        personUuid,
        email,
        workspace: this.workspace,
        error: err instanceof Error ? err.message : String(err)
      })

      // Remove failed lookup from cache to allow retry
      this.cache.delete(personUuid)

      // Re-throw to allow handling upstream
      throw err
    }
  }
}

/**
 * Factory for creating and managing PersonSpacesCache instances per workspace
 */
export const PersonSpacesCacheFactory = {
  instances: new Map<WorkspaceUuid, PersonSpacesCache>(),

  getInstance (ctx: MeasureContext, client: TxOperations, workspace: WorkspaceUuid): PersonSpacesCache {
    let instance = PersonSpacesCacheFactory.instances.get(workspace)

    if (instance === undefined) {
      instance = new PersonSpacesCache(ctx, client, workspace)
      PersonSpacesCacheFactory.instances.set(workspace, instance)
    }

    return instance
  },

  resetInstance (workspace: WorkspaceUuid): void {
    PersonSpacesCacheFactory.instances.delete(workspace)
  },

  resetAllInstances (): void {
    PersonSpacesCacheFactory.instances.clear()
  },

  get instanceCount (): number {
    return PersonSpacesCacheFactory.instances.size
  }
}
