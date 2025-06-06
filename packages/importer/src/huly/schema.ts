import card from '@hcengineering/card'
import core from '@hcengineering/core'
import * as fs from 'fs'
import * as path from 'path'

export interface BaseFieldType {
  name: string
  isValid: (value: unknown, args?: Record<string, unknown>) => boolean
}

export const StringFieldType: BaseFieldType = {
  name: 'string',
  isValid: (value: unknown) => typeof value === 'string'
}

export const NumberFieldType: BaseFieldType = {
  name: 'number',
  isValid: (value: unknown) => typeof value === 'number'
}

export const BooleanFieldType: BaseFieldType = {
  name: 'boolean',
  isValid: (value: unknown) => typeof value === 'boolean'
}

export const PathFieldType: BaseFieldType = {
  name: 'existing-path',
  isValid: (value: unknown, args?: Record<string, unknown>): boolean => {
    const strValue = value as string
    const resolvedPath = path.resolve(args?.currentPath as string, strValue)
    if (resolvedPath === undefined) {
      return false
    } else if (!fs.existsSync(resolvedPath)) {
      return false
    }
    return true
  }
}

export class ConstantFieldType implements BaseFieldType {
  name: string
  value: unknown

  constructor (value: unknown) {
    this.name = value as string
    this.value = value
  }

  isValid (value: unknown): boolean {
    return value === this.value
  }
}

export class OneOfFieldType implements BaseFieldType {
  name: string
  value: unknown[]

  constructor (value: unknown[]) {
    this.name = 'one of ' + value.join(', ')
    this.value = value
  }

  isValid (value: unknown): boolean {
    return this.value.includes(value)
  }
}

export const PropertyFieldType: BaseFieldType = {
  name: 'property-field-type',
  isValid: (value: unknown, args?: Record<string, unknown>) => {
    if (value === undefined || value === null || typeof value !== 'object') return false

    const { label, type, enumOf, refTo, isArray, ...rest } = value as any

    if (label === undefined || label == null || label === '') {
      return false
    }
    if (enumOf !== undefined) {
      if (typeof enumOf === 'string' && type === undefined && refTo === undefined) {
        return PathFieldType.isValid(enumOf, args)
      }
      return false
    }
    if (refTo !== undefined) {
      if (typeof refTo === 'string' && type === undefined && enumOf === undefined) {
        return PathFieldType.isValid(refTo, args)
      }
      return false
    }
    if (type !== undefined) {
      return (type === 'TypeString' || type === 'TypeNumber' || type === 'TypeBoolean') && isArray === undefined
    }
    if (Object.keys(rest).length > 0) {
      return false
    }
    return true
  }
}

export interface FieldType {
  type: BaseFieldType
  isArray: boolean
}

export interface FormatSchema {
  requiredFields: Map<string, FieldType>
  optionalFields: Map<string, FieldType>
}

export const AssociationSchema: FormatSchema = {
  requiredFields: new Map([
    ['class', { type: new ConstantFieldType(core.class.Association), isArray: false }],
    ['typeA', { type: PathFieldType, isArray: false }],
    ['typeB', { type: PathFieldType, isArray: false }],
    ['nameA', { type: StringFieldType, isArray: false }],
    ['nameB', { type: StringFieldType, isArray: false }],
    ['type', { type: new OneOfFieldType(['1:1', '1:N', 'N:N']), isArray: false }]
  ]),
  optionalFields: new Map()
}

export const EnumSchema: FormatSchema = {
  requiredFields: new Map([
    ['class', { type: new ConstantFieldType(core.class.Enum), isArray: false }],
    ['title', { type: StringFieldType, isArray: false }],
    ['values', { type: StringFieldType, isArray: true }]
  ]),
  optionalFields: new Map()
}

export const MasterTagSchema: FormatSchema = {
  requiredFields: new Map([
    ['class', { type: new ConstantFieldType(card.class.MasterTag), isArray: false }],
    ['title', { type: StringFieldType, isArray: false }]
  ]),
  optionalFields: new Map([['properties', { type: PropertyFieldType, isArray: true }]])
}

export const TagSchema: FormatSchema = {
  requiredFields: new Map([
    ['class', { type: new ConstantFieldType(card.class.Tag), isArray: false }],
    ['title', { type: StringFieldType, isArray: false }]
  ]),
  optionalFields: new Map([['properties', { type: PropertyFieldType, isArray: true }]])
}
