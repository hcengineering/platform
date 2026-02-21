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

import type { Doc, Class, Ref, Hierarchy } from '@hcengineering/core'
import type { ValueFormatter } from '../types'

/**
 * Registry for value formatters by document class
 * Plugins can register custom formatters for specific document classes
 */
const valueFormattersByClass = new Map<Ref<Class<Doc>>, ValueFormatter[]>()

/**
 * Global formatters (checked for all classes)
 */
const globalValueFormatters: ValueFormatter[] = []

/**
 * Register a value formatter for a specific document class
 * @param _class - The document class this formatter applies to
 * @param formatter - The formatter function to register
 */
export function registerValueFormatterForClass (_class: Ref<Class<Doc>>, formatter: ValueFormatter): void {
  const formatters = valueFormattersByClass.get(_class) ?? []
  formatters.push(formatter)
  valueFormattersByClass.set(_class, formatters)
}

/**
 * Register a global value formatter (applies to all classes)
 * @param formatter - The formatter function to register
 * @deprecated Use registerValueFormatterForClass for better performance and explicit class association
 */
export function registerValueFormatter (formatter: ValueFormatter): void {
  globalValueFormatters.push(formatter)
}

/**
 * Get formatters for a specific class (including parent classes)
 */
export function getFormattersForClass (hierarchy: Hierarchy, _class: Ref<Class<Doc>>): ValueFormatter[] {
  const formatters: ValueFormatter[] = []

  // Get formatters for this class and all parent classes
  let currentClass: Ref<Class<Doc>> | undefined = _class
  while (currentClass !== undefined) {
    const classFormatters = valueFormattersByClass.get(currentClass)
    if (classFormatters !== undefined) {
      formatters.push(...classFormatters)
    }
    const classDef: Class<Doc> | undefined = hierarchy.getClass(currentClass)
    currentClass = classDef?.extends
  }

  // Add global formatters
  formatters.push(...globalValueFormatters)

  return formatters
}
