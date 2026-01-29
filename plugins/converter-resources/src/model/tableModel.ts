//
// Copyright © 2026 Hardcore Engineering Inc.
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

import core, { type Class, type Client, type Doc, type Hierarchy, type Ref } from '@hcengineering/core'
import type { AttributeModel, BuildModelKey, Viewlet } from '@hcengineering/view'
import viewPlugin from '@hcengineering/view'
import { buildModel, buildConfigLookup } from '@hcengineering/view-resources'
import { DocumentAttributeKey } from '../formatter/utils'

/**
 * Convert AttributeModel array back to config format (Array<string | BuildModelKey>)
 * Preserves custom attributes by using label as key when key is empty
 */
export function modelToConfig (model: AttributeModel[]): Array<string | BuildModelKey> {
  return model.map((m) => {
    if (m.key === '' && typeof m.label === 'string' && m.label.startsWith('custom')) {
      return {
        key: m.label,
        label: m.label,
        displayProps: m.displayProps,
        props: m.props,
        sortingKey: m.sortingKey
      }
    }
    if (m.key !== '') {
      return m.key
    }
    if (m.castRequest !== undefined) {
      return {
        key: m.key,
        label: m.label,
        displayProps: m.displayProps,
        props: m.props,
        sortingKey: m.sortingKey
      }
    }
    return m.key
  })
}

/**
 * Build AttributeModel from viewlet config (or default config)
 */
export async function buildTableModel (
  client: Client,
  hierarchy: Hierarchy,
  _class: Ref<Class<Doc>>,
  viewlet: Viewlet | undefined
): Promise<AttributeModel[]> {
  if (viewlet !== undefined) {
    const preferences = await client.findAll(viewPlugin.class.ViewletPreference, {
      space: core.space.Workspace,
      attachedTo: viewlet._id
    })
    const config = preferences.length > 0 && preferences[0].config.length > 0 ? preferences[0].config : viewlet.config

    const lookup = buildConfigLookup(hierarchy, _class, config, viewlet.options?.lookup)
    const hiddenKeys = viewlet.configOptions?.hiddenKeys ?? []
    const model = await buildModel({
      client,
      _class,
      keys: config.filter((key: string | BuildModelKey) => {
        if (typeof key === 'string') {
          return !hiddenKeys.includes(key)
        }
        return !hiddenKeys.includes(key.key) && key.displayProps?.grow !== true
      }),
      lookup
    })

    return model.filter((attr) => attr.displayProps?.grow !== true)
  }

  const defaultConfig: Array<string | BuildModelKey> = [
    '', // Object presenter (title)
    DocumentAttributeKey.CreatedBy,
    DocumentAttributeKey.CreatedOn,
    DocumentAttributeKey.ModifiedBy,
    DocumentAttributeKey.ModifiedOn
  ]

  const model = await buildModel({
    client,
    _class,
    keys: defaultConfig,
    lookup: undefined
  })

  return model.filter((attr) => {
    if (
      attr.key === DocumentAttributeKey.CreatedBy ||
      attr.key === DocumentAttributeKey.CreatedOn ||
      attr.key === DocumentAttributeKey.ModifiedBy ||
      attr.key === DocumentAttributeKey.ModifiedOn
    ) {
      return hierarchy.findAttribute(_class, attr.key) !== undefined
    }
    return true
  })
}
