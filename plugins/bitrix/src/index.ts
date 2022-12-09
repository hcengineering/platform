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

import { ChannelProvider } from '@hcengineering/contact'
import type { AttachedDoc, Class, Doc, Mixin, Ref, Space } from '@hcengineering/core'
import type { Plugin } from '@hcengineering/platform'
import { Asset, plugin } from '@hcengineering/platform'
import { ExpertKnowledge, InitialKnowledge, MeaningfullKnowledge } from '@hcengineering/tags'
import { AnyComponent } from '@hcengineering/ui'

/**
 * @public
 */
export interface BitrixSyncDoc extends Doc {
  type: string
  bitrixId: string
}

/**
 * @public
 */
export enum BitrixEntityType {
  Comment = 'crm.timeline.comment',
  Binding = 'crm.timeline.bindings',
  Lead = 'crm.lead',
  Activity = 'crm.activity',
  Company = 'crm.company'
}

/**
 * @public
 */
export const mappingTypes = [
  { label: 'Leads', id: BitrixEntityType.Lead },
  // { label: 'Comments', id: BitrixEntityType.Comment },
  { label: 'Company', id: BitrixEntityType.Company }
  // { label: 'Activity', id: BitrixEntityType.Activity }
]

/**
 * @public
 */
export interface FieldValue {
  type: string
  statusType?: string
  isRequired: boolean
  isReadOnly: boolean
  isImmutable: boolean
  isMultiple: boolean
  isDynamic: boolean
  title: string

  formLabel?: string
  filterLabel?: string
  items?: Array<{
    ID: string
    VALUE: string
  }>
}

/**
 * @public
 */
export interface Fields {
  [key: string]: FieldValue
}

/**
 * @public
 */
export interface BitrixEntityMapping extends Doc {
  ofClass: Ref<Class<Doc>>
  type: string
  bitrixFields: Fields

  fields: number

  comments: boolean
  activity: boolean
  attachments: boolean
}
/**
 * @public
 */
export enum MappingOperation {
  CopyValue,
  CreateTag, // Create tag
  CreateChannel // Create channel
}
/**
 * @public
 */
export interface CopyPattern {
  text: string
  field?: string
  alternatives?: string[]
}
/**
 * @public
 */
export interface CopyValueOperation {
  kind: MappingOperation.CopyValue
  patterns: CopyPattern[]
}

/**
 * @public
 */
export interface TagField {
  weight: InitialKnowledge | MeaningfullKnowledge | ExpertKnowledge

  field: string
  split: string // If defined values from field will be split to check for multiple values.
}
/**
 * @public
 */
export interface CreateTagOperation {
  kind: MappingOperation.CreateTag

  fields: TagField[]
}

/**
 * @public
 */
export interface ChannelFieldMapping {
  provider: Ref<ChannelProvider>
  field: string
}

/**
 * @public
 */
export interface CreateChannelOperation {
  kind: MappingOperation.CreateChannel
  fields: ChannelFieldMapping[]
}

/**
 * @public
 */
export interface BitrixFieldMapping extends AttachedDoc {
  ofClass: Ref<Class<Doc>> // Specify mixin if applicable
  attributeName: string

  operation: CopyValueOperation | CreateTagOperation | CreateChannelOperation
}

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
    BitrixIntegration: '' as AnyComponent
  },
  icon: {
    Bitrix: '' as Asset
  },
  space: {
    Mappings: '' as Ref<Space>
  }
})
