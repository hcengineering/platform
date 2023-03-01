//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import type { Class, Doc, Ref, Space } from '@hcengineering/core'
import type { IntlString, Plugin, Resource } from '@hcengineering/platform'
import { Asset, plugin } from '@hcengineering/platform'

/**
 * @public
 */
export interface TemplateCategory extends Space {}

/**
 * @public
 */
export interface MessageTemplate extends Doc {
  space: Ref<TemplateCategory>
  title: string
  message: string
}

/**
 * @public
 */
export interface TemplateData {
  owner: string
  data: any
}

/**
 * @public
 */
export interface TemplateDataProvider {
  set: (key: Ref<Class<Doc>>, value: any) => void
  get: (key: Ref<Class<Doc>>) => any | undefined
  fillTemplate: (message: string) => Promise<string>
  destroy: () => void
}

/**
 * @public
 */
export interface TemplateFieldCategory extends Doc {
  label: IntlString
}

/**
 * @public
 */
export declare type TemplateFieldFunc = (provider: TemplateDataProvider) => Promise<string | undefined>

/**
 * @public
 */
export interface TemplateField extends Doc {
  category: Ref<TemplateFieldCategory>
  label: IntlString
  func: Resource<TemplateFieldFunc>
}

/**
 * @public
 */
export const templatesId = 'templates' as Plugin

export default plugin(templatesId, {
  class: {
    MessageTemplate: '' as Ref<Class<MessageTemplate>>,
    TemplateCategory: '' as Ref<Class<TemplateCategory>>,
    TemplateField: '' as Ref<Class<TemplateField>>,
    TemplateFieldCategory: '' as Ref<Class<TemplateFieldCategory>>
  },
  space: {
    Templates: '' as Ref<TemplateCategory>
  },
  icon: {
    Templates: '' as Asset,
    Template: '' as Asset,
    Copy: '' as Asset
  },
  function: {
    GetTemplateDataProvider: '' as Resource<() => TemplateDataProvider>
  }
})
