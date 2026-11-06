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

import core, {
  type AnyAttribute,
  type ArrOf,
  type Enum,
  type EnumOf,
  type Hierarchy,
  type Type
} from '@hcengineering/core'

function referencesEnum (type: Type<unknown>, value: Enum, hierarchy: Hierarchy): boolean {
  if (hierarchy.isDerived(type._class, core.class.EnumOf)) return (type as EnumOf).of === value._id
  if (hierarchy.isDerived(type._class, core.class.ArrOf)) {
    return referencesEnum((type as ArrOf<unknown>).of, value, hierarchy)
  }
  return false
}

/**
 * Labels are stored IDs. Preserve every existing choice on any referenced enum,
 * including choices not currently used by objects or defaults. The model contains
 * all field definitions, unlike a permission-filtered scan of workspace objects.
 * This Settings guard does not provide an atomic server-side migration policy.
 */
export function canChangeEnumValues (
  value: Enum,
  edited: string[],
  attributes: AnyAttribute[],
  hierarchy: Hierarchy
): boolean {
  const retained = new Set(edited)
  if (value.enumValues.every((option) => retained.has(option))) return true
  return !attributes.some((attribute) => referencesEnum(attribute.type, value, hierarchy))
}
