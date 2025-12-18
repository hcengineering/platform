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

import { type Class, type Doc, type MeasureContext, type Ref, type Space, type TxOperations } from '@hcengineering/core'
import { type ExportState } from './types'

/**
 * Handles data preparation, remapping, and field mapping for document export
 */
export class DataMapper {
  constructor (
    private readonly context: MeasureContext,
    private readonly targetClient: TxOperations,
    private readonly state: ExportState,
    private readonly fieldMappers: Record<string, Record<string, any>>,
    private readonly currentAccountEmployeeId: Ref<any> | undefined
  ) {}

  /**
   * Prepare document data for export, remapping references and applying field mappers
   */
  async prepareDocumentData (doc: Doc, targetSpace: Ref<Space>, isAttached: boolean): Promise<Record<string, any>> {
    const hierarchy = this.targetClient.getHierarchy()
    const attributes = hierarchy.getAllAttributes(doc._class)
    const data: Record<string, any> = {}

    // First pass: Copy attributes using hierarchy info
    for (const [key] of Array.from(attributes)) {
      if (key === '_id' || key === '_class' || key === 'space') {
        continue
      }

      const value = (doc as any)[key]
      if (value === undefined) {
        continue
      }

      // For attached docs, still remap attachedTo reference (but not attachedToClass/collection)
      if (isAttached && key === 'attachedTo') {
        // Remap the attachedTo reference to the new target ID
        data[key] = this.remapValue(value, key)
        continue
      }

      if (isAttached && (key === 'attachedToClass' || key === 'collection')) {
        data[key] = value
        continue
      }

      // Remap references - use recursive remapping for all values
      data[key] = this.remapValue(value, key)
    }

    // Second pass: Check all doc properties for any missed references
    // This catches fields that might not be in getAllAttributes
    for (const key of Object.keys(doc)) {
      if (
        key === '_id' ||
        key === '_class' ||
        key === 'space' ||
        key === 'modifiedOn' ||
        key === 'modifiedBy' ||
        key === 'createdOn' ||
        key === 'createdBy'
      ) {
        continue
      }

      // Skip if already processed
      if (data[key] !== undefined) {
        continue
      }

      const value = (doc as any)[key]
      if (value === undefined) {
        continue
      }

      data[key] = this.remapValue(value, key)
    }

    // Apply field mappers for specific document classes
    await this.applyFieldMappers(doc._class, data)

    return data
  }

  /**
   * Apply field mappers for specific document classes.
   * Field mappers format: { className: { fieldName: value, ... } }
   * Special value '$currentUser' is replaced with current account's employee ID
   */
  private async applyFieldMappers (docClass: Ref<Class<Doc>>, data: Record<string, any>): Promise<void> {
    const hierarchy = this.targetClient.getHierarchy()

    // Find field mapper for this class or any of its base classes
    let fieldMapper: Record<string, any> | undefined

    // First check exact class match
    if (this.fieldMappers[docClass] !== undefined) {
      fieldMapper = this.fieldMappers[docClass]
      this.context.info(`Found exact field mapper match for class ${docClass}`)
    } else {
      // Check all base classes - find the most specific (closest) mapper
      let bestMapper: Record<string, any> | undefined
      let bestMapperClass: string | undefined

      for (const [className, mapper] of Object.entries(this.fieldMappers)) {
        const mapperClass = className as Ref<Class<Doc>>
        if (hierarchy.isDerived(docClass, mapperClass)) {
          if (bestMapper === undefined) {
            bestMapper = mapper
            bestMapperClass = className
          } else if (hierarchy.isDerived(mapperClass, bestMapperClass as Ref<Class<Doc>>)) {
            bestMapper = mapper
            bestMapperClass = className
          }
        }
      }

      if (bestMapper !== undefined) {
        fieldMapper = bestMapper
      }
    }

    if (fieldMapper === undefined) {
      return
    }

    // Apply field mappings
    for (const [fieldName, fieldValue] of Object.entries(fieldMapper)) {
      // Handle special $currentUser value
      if (fieldValue === '$currentUser') {
        if (this.currentAccountEmployeeId !== undefined) {
          data[fieldName] = this.currentAccountEmployeeId
          this.context.info(`Mapped ${fieldName}: $currentUser -> ${this.currentAccountEmployeeId}`)
        } else {
          this.context.warn(`Cannot map ${fieldName}: $currentUser but current account employee not found`)
        }
      } else if (fieldValue === '') {
        // Empty string means clear the field
        data[fieldName] = undefined
      } else {
        // Direct value assignment
        data[fieldName] = fieldValue
      }
    }
  }

  /**
   * Recursively remap a value, handling nested objects and arrays.
   */
  remapValue (value: any, fieldPath: string = ''): any {
    if (value === null || value === undefined) {
      return value
    }

    // String - check if it's an ID that needs remapping
    if (typeof value === 'string') {
      const refValue = value as Ref<Doc>
      const remapped = this.state.idMapping.get(refValue)
      if (remapped !== undefined) {
        return remapped
      }
      return value
    }

    // Array - remap each element
    if (Array.isArray(value)) {
      return value.map((v, i) => this.remapValue(v, `${fieldPath}[${i}]`))
    }

    // Object - recursively remap all properties
    if (typeof value === 'object') {
      const result: Record<string, any> = {}
      for (const [key, v] of Object.entries(value)) {
        result[key] = this.remapValue(v, fieldPath !== '' ? `${fieldPath}.${key}` : key)
      }
      return result
    }

    return value
  }
}
