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
   * Special values:
   * - '$currentUser' is replaced with current account's employee ID
   * - '$ensureUnique' ensures the field value is unique by checking database and modifying if needed
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
      } else if (fieldValue === '$ensureUnique') {
        // Ensure field value is unique (globally, not per space)
        await this.ensureFieldUnique(docClass, fieldName, data)
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
   * Ensure a field value is unique by checking the database and modifying if needed.
   * Uses the document's `prefix` field to query documents with the same template/prefix,
   * ensuring uniqueness within that group. Falls back to global uniqueness if no prefix is available.
   * - For documents with prefix: queries by prefix field and ensures uniqueness within that group
   * - For documents without prefix: uses fallback queries (exact match for strings, >= for numbers)
   */
  private async ensureFieldUnique (
    docClass: Ref<Class<Doc>>,
    fieldName: string,
    data: Record<string, any>
  ): Promise<void> {
    const currentValue = data[fieldName]
    if (currentValue === undefined || currentValue === null) {
      return
    }

    // Initialize unique values tracking if not exists
    if (this.state.uniqueFieldValues === undefined) {
      this.state.uniqueFieldValues = new Map()
    }

    const classKey = docClass
    if (!this.state.uniqueFieldValues.has(classKey)) {
      this.state.uniqueFieldValues.set(classKey, new Map())
    }

    let fieldMap = this.state.uniqueFieldValues.get(classKey)
    if (fieldMap === undefined) {
      fieldMap = new Map()
      this.state.uniqueFieldValues.set(classKey, fieldMap)
    }

    let usedValues = fieldMap.get(fieldName)
    if (usedValues === undefined) {
      usedValues = new Set()
      fieldMap.set(fieldName, usedValues)
    }

    const projection = { [fieldName]: 1 } as any

    let uniqueValue: string | number = currentValue

    if (typeof currentValue === 'string') {
      const documentPrefix = data.prefix
      if (documentPrefix !== undefined && typeof documentPrefix === 'string' && documentPrefix !== '') {
        const codeMatch = currentValue.match(/-(\d+)$/)
        const baseNum = codeMatch !== null ? parseInt(codeMatch[1], 10) : parseInt(currentValue, 10)

        const query: any = { prefix: documentPrefix }

        const prefixProjection = { [fieldName]: 1, prefix: 1 } as any

        const existingDocs = await this.targetClient.findAll(docClass, query, { projection: prefixProjection })

        const existingValues = new Set<string>()
        for (const doc of existingDocs) {
          const value = (doc as any)[fieldName]
          if (value !== undefined && value !== null) {
            existingValues.add(String(value))
          }
        }

        for (const usedValue of usedValues) {
          if (typeof usedValue === 'string') {
            existingValues.add(usedValue)
          }
        }

        const isCurrentValueUnique = !existingValues.has(currentValue)

        if (isCurrentValueUnique) {
          uniqueValue = currentValue
        } else {
          const existingNumbers = new Set<number>()
          for (const val of existingValues) {
            const match = val.match(/-(\d+)$/)
            if (match !== null) {
              existingNumbers.add(parseInt(match[1], 10))
            } else {
              const num = parseInt(val, 10)
              if (!isNaN(num)) {
                existingNumbers.add(num)
              }
            }
          }

          const maxNum = existingNumbers.size > 0 ? Math.max(...Array.from(existingNumbers), baseNum - 1) : baseNum - 1
          // Generate new value: if original had pattern "PREFIX-N", use same pattern, otherwise just use number
          if (codeMatch !== null) {
            const originalPrefix = currentValue.substring(0, currentValue.lastIndexOf('-'))
            uniqueValue = `${originalPrefix}-${maxNum + 1}`
          } else {
            uniqueValue = String(maxNum + 1)
          }
          this.context.info(
            `ensureFieldUnique: ${fieldName} value ${currentValue} conflicts within prefix "${documentPrefix}", generating new value: ${uniqueValue}`
          )
        }
      } else {
        // No prefix pattern, check if exact value exists - global uniqueness
        const query: any = { [fieldName]: currentValue }

        const existing = await this.targetClient.findOne(docClass, query, { projection })
        const isUsedInBatch = usedValues.has(currentValue)

        if (existing === undefined && !isUsedInBatch) {
          // Value is unique, use it as-is
          uniqueValue = currentValue
        } else {
          // Value exists, append suffix
          let attempt = 1
          while (attempt < 10) {
            uniqueValue = `${currentValue}-${attempt}`
            const checkQuery: any = { [fieldName]: uniqueValue }
            const checkExisting = await this.targetClient.findOne(docClass, checkQuery, { projection })
            if (checkExisting === undefined && !usedValues.has(uniqueValue)) {
              break
            }
            attempt++
          }
          if (attempt >= 10) {
            this.context.error(
              `ensureFieldUnique: Failed to find unique value for field ${fieldName} after 10 attempts`
            )
            return
          }
        }
      }
    } else if (typeof currentValue === 'number') {
      // For numeric fields like seqNumber, check if document has a prefix field
      // If so, ensure uniqueness within the same prefix (template) group
      const documentPrefix = data.prefix
      if (documentPrefix !== undefined && typeof documentPrefix === 'string' && documentPrefix !== '') {
        // Query all documents with the same prefix (same template) - global uniqueness
        const query: any = { prefix: documentPrefix }

        // Project both the field we're checking and prefix to verify
        const prefixProjection = { [fieldName]: 1, prefix: 1 } as any

        const existingDocs = await this.targetClient.findAll(docClass, query, { projection: prefixProjection })

        // Extract all numbers from existing values
        const existingNumbers = new Set<number>()
        for (const doc of existingDocs) {
          const value = (doc as any)[fieldName]
          if (typeof value === 'number') {
            existingNumbers.add(value)
          }
        }

        // Also check values used in this export batch
        for (const usedValue of usedValues) {
          if (typeof usedValue === 'number') {
            existingNumbers.add(usedValue)
          }
        }

        // Check if current value is already unique
        const isCurrentValueUnique = !existingNumbers.has(currentValue) && !usedValues.has(currentValue)

        if (isCurrentValueUnique) {
          // Current value is unique, keep it
          uniqueValue = currentValue
        } else {
          // Find max number and use max + 1
          const maxNum = existingNumbers.size > 0 ? Math.max(...Array.from(existingNumbers)) : currentValue - 1
          uniqueValue = maxNum + 1
          this.context.info(
            `ensureFieldUnique: ${fieldName} value ${currentValue} conflicts within prefix "${documentPrefix}", generating new value: ${uniqueValue}`
          )
        }
      } else {
        // No prefix field, fall back to querying all values >= current - global uniqueness
        const query: any = { [fieldName]: { $gte: currentValue } }

        const existingDocs = await this.targetClient.findAll(docClass, query, { projection })

        // Extract all numbers from existing values
        const existingNumbers = new Set<number>()
        for (const doc of existingDocs) {
          const value = (doc as any)[fieldName]
          if (typeof value === 'number') {
            existingNumbers.add(value)
          }
        }

        // Also check values used in this export batch
        for (const usedValue of usedValues) {
          if (typeof usedValue === 'number' && usedValue >= currentValue) {
            existingNumbers.add(usedValue)
          }
        }

        // Check if current value is already unique
        const isCurrentValueUnique = !existingNumbers.has(currentValue) && !usedValues.has(currentValue)

        if (isCurrentValueUnique) {
          // Current value is unique, keep it
          uniqueValue = currentValue
        } else {
          // Find max number and use max + 1
          const maxNum = existingNumbers.size > 0 ? Math.max(...Array.from(existingNumbers)) : currentValue - 1
          uniqueValue = maxNum + 1
          this.context.info(
            `ensureFieldUnique: ${fieldName} value ${currentValue} conflicts, generating new value: ${uniqueValue}`
          )
        }
      }
    } else {
      // Unsupported type, skip uniqueness check
      this.context.warn(`Cannot ensure uniqueness for field ${fieldName} with type ${typeof currentValue}`)
      return
    }

    // Update data with unique value
    data[fieldName] = uniqueValue
    usedValues.add(uniqueValue)

    if (uniqueValue !== currentValue) {
      this.context.info(
        `ensureFieldUnique: Updated ${fieldName} from ${currentValue} to ${uniqueValue} (class: ${docClass})`
      )
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
