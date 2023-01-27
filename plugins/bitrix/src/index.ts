//
// Copyright © 2022 Hardcore Engineering Inc.
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

import type { Class, Mixin, Ref, Space } from '@hcengineering/core'
import type { Plugin, Resource } from '@hcengineering/platform'
import { Asset, plugin } from '@hcengineering/platform'
import { BitrixEntityMapping, BitrixFieldMapping, BitrixSyncDoc } from './types'

/**
 * @public
 */
export const bitrixId = 'bitrix' as Plugin

export default plugin(bitrixId, {
  mixin: {
    BitrixSyncDoc: '' as Ref<Mixin<BitrixSyncDoc>>
  },
  class: {
    EntityMapping: '' as Ref<Class<BitrixEntityMapping>>,
    FieldMapping: '' as Ref<Class<BitrixFieldMapping>>
  },
  component: {
    BitrixIntegration: '' as Resource<any>
  },
  icon: {
    Bitrix: '' as Asset
  },
  space: {
    Mappings: '' as Ref<Space>
  }
})

export * from './client'
export * from './sync'
export * from './types'
export * from './utils'
