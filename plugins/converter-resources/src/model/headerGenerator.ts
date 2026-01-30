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

import type { Class, Doc, Hierarchy, Ref } from '@hcengineering/core'
import { translate, type IntlString } from '@hcengineering/platform'
import type { AttributeModel } from '@hcengineering/view'
import { isIntlString } from '../formatter/utils'

/**
 * Resolve the human-readable label for a custom attribute
 */
export async function resolveCustomAttributeLabel (
  attrLabel: string,
  docClass: Ref<Class<Doc>>,
  hierarchy: Hierarchy,
  language: string | undefined
): Promise<string> {
  if (!attrLabel.startsWith('custom')) {
    return attrLabel
  }

  let customAttr = hierarchy.findAttribute(docClass, attrLabel)
  if (customAttr === undefined) {
    const allAttrs = hierarchy.getAllAttributes(docClass)
    customAttr = allAttrs.get(attrLabel)
  }

  if (customAttr?.label !== undefined) {
    return await translate(customAttr.label, {}, language)
  }

  return attrLabel
}

/**
 * Generate table headers from AttributeModel array
 * Handles custom attributes, IntlStrings, and regular labels
 */
export async function generateHeaders (
  model: AttributeModel[],
  firstDocClass: Ref<Class<Doc>>,
  hierarchy: Hierarchy,
  language: string | undefined
): Promise<string[]> {
  const headers: string[] = []
  for (const attr of model) {
    let label: string
    if (typeof attr.label === 'string') {
      if (attr.label.startsWith('custom')) {
        label = await resolveCustomAttributeLabel(attr.label, firstDocClass, hierarchy, language)
      } else if (isIntlString(attr.label)) {
        label = await translate(attr.label as unknown as IntlString, {}, language)
      } else {
        label = attr.label
      }
    } else {
      label = await translate(attr.label, {}, language)
    }
    headers.push(label)
  }
  return headers
}
