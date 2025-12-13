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

import {
  type AccountUuid,
  type Data,
  type Hierarchy,
  type LowLevelStorage,
  type MeasureContext,
  type Ref,
  type Space,
  type TxOperations
} from '@hcengineering/core'
import core from '@hcengineering/model-core'
import { type ExportState } from './types'

/**
 * Handles space export between workspaces
 */
export class SpaceExporter {
  constructor (
    private readonly context: MeasureContext,
    private readonly targetClient: TxOperations,
    private readonly state: ExportState,
    private readonly currentAccount: AccountUuid | undefined
  ) {}

  /**
   * Get or create target space, reusing existing space if found by name and class
   */
  async getOrCreateTargetSpace (
    sourceSpaceId: Ref<Space>,
    sourceHierarchy: Hierarchy,
    sourceLowLevel: LowLevelStorage
  ): Promise<Ref<Space>> {
    // Check if already mapped
    const existing = this.state.spaceMapping.get(sourceSpaceId)
    if (existing !== undefined) {
      return existing
    }

    // Find space in source
    const spaceDomain = sourceHierarchy.findDomain(core.class.Space)
    if (spaceDomain === undefined) {
      throw new Error('Space domain not found')
    }

    const sourceSpaces = await sourceLowLevel.rawFindAll<Space>(spaceDomain, {
      _id: sourceSpaceId
    })

    if (sourceSpaces.length === 0) {
      throw new Error(`Source space ${sourceSpaceId} not found`)
    }

    const sourceSpace = sourceSpaces[0]

    // Check if space exists in target workspace
    const targetSpaces = await this.targetClient.findAll(core.class.Space, {
      _class: sourceSpace._class,
      name: sourceSpace.name
    })

    let targetSpaceId: Ref<Space>

    if (targetSpaces.length > 0) {
      // Space already exists, use it
      targetSpaceId = targetSpaces[0]._id
      this.context.info(`Using existing space ${targetSpaceId}`)
    } else {
      // Create new space with current user as member/owner
      const spaceData: Data<Space> & { owners?: AccountUuid[] } = {
        name: sourceSpace.name,
        description: sourceSpace.description,
        private: sourceSpace.private,
        archived: sourceSpace.archived ?? false,
        members: this.currentAccount !== undefined ? [this.currentAccount] : [],
        owners: this.currentAccount !== undefined ? [this.currentAccount] : []
      }

      // Copy type-specific attributes if needed
      const targetHierarchy = this.targetClient.getHierarchy()
      const attributes = targetHierarchy.getAllAttributes(sourceSpace._class)

      for (const [key] of Array.from(attributes)) {
        if (
          key === '_id' ||
          key === '_class' ||
          key === 'space' ||
          key === 'members' ||
          key === 'owners' ||
          key === 'admins' ||
          key === 'name' ||
          key === 'description' ||
          key === 'private' ||
          key === 'archived'
        ) {
          continue
        }

        const value = (sourceSpace as any)[key]
        if (value !== undefined) {
          ;(spaceData as any)[key] = value
        }
      }

      targetSpaceId = await this.targetClient.createDoc(sourceSpace._class, core.space.Space, spaceData)

      this.context.info(`Created new space ${targetSpaceId} (${sourceSpace.name})`)
    }

    // Update mapping and mark as migrated
    this.state.spaceMapping.set(sourceSpaceId, targetSpaceId)
    return targetSpaceId
  }
}
