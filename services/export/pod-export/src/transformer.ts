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
  type TransformConfig,
  type AttributeTransform,
  type TransformOperation,
  OperationType,
  type OperationConfig
} from '@hcengineering/export'

export class Transformer {
  private readonly skipAttributes: Set<string>
  private readonly attributeKeyMap: Map<string, string>
  private readonly attributeTransforms: Map<string, AttributeTransform>

  constructor (config: TransformConfig = {}) {
    // Initialize skip attributes
    this.skipAttributes = new Set(config.skipAttributes ?? [])

    // Initialize attribute key mapping
    this.attributeKeyMap = new Map()
    if (config.attributeKeyMap !== undefined) {
      Object.entries(config.attributeKeyMap).forEach(([key, value]) => {
        this.attributeKeyMap.set(key, value)
      })
    }

    // Initialize attribute transforms
    this.attributeTransforms = new Map()
    if (config.attributeTransforms !== undefined) {
      Object.entries(config.attributeTransforms).forEach(([key, transform]) => {
        this.attributeTransforms.set(key, transform)
      })
    }
  }

  public isAttributeNeeded (key: string): boolean {
    return !this.skipAttributes.has(key)
  }

  public transformAttribute (key: string, value: any): Record<string, any> {
    // 1. if attribute is not needed, return empty object
    if (!this.isAttributeNeeded(key)) {
      return {}
    }

    // check if there is a special transformation for this key
    const transform = this.attributeTransforms.get(key)
    if (transform !== undefined) {
      return this.applyTransform(value, transform)
    }

    const transformedKey = this.transformAttributeKey(key)

    // 2. if value is an array, return {key, value.length}
    if (Array.isArray(value)) {
      return { [transformedKey]: value.length }
    }

    // 3. if value is an object, return object with prefix "key."
    if (value !== null && typeof value === 'object') {
      const result: Record<string, any> = {}
      for (const [objKey, objValue] of Object.entries(value)) {
        result[`${transformedKey}.${objKey}`] = objValue
      }
      return result
    }

    // 4. if value is a primitive, return {key, value}
    return { [transformedKey]: value }
  }

  private transformAttributeKey (key: string): string {
    return this.attributeKeyMap.get(key) ?? key
  }

  private applyTransform (value: any, transform: AttributeTransform): Record<string, any> {
    let result = value

    // apply operations sequentially
    for (const operation of transform.operations) {
      result = this.applyOperation(result, operation)
    }

    // if result is an object, return it
    if (result !== null && typeof result === 'object' && !Array.isArray(result)) {
      return result as Record<string, any>
    }

    // otherwise wrap in an object with key "value"
    return { value: result }
  }

  private applyOperation (value: any, operation: TransformOperation): any {
    switch (operation.type) {
      case OperationType.IDENTITY:
        return value

      case OperationType.GROUP_BY: {
        if (!Array.isArray(value)) return value

        const { keyField, valueField } = operation.config as OperationConfig[OperationType.GROUP_BY]
        const result: Record<string, any[]> = {}

        for (const item of value) {
          const key = this.getNestedValue(item, keyField)
          if (key === undefined) continue

          if (result[key] === undefined) {
            result[key] = []
          }

          if (valueField !== undefined) {
            const itemValue = this.getNestedValue(item, valueField)
            if (itemValue !== undefined) {
              result[key].push(itemValue)
            }
          } else {
            result[key].push(item)
          }
        }

        return result
      }

      default:
        return value
    }
  }

  private getNestedValue (obj: any, path: string): any {
    const parts = path.split('.')
    let current = obj

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined
      }

      current = current[part]
    }

    return current
  }
}
