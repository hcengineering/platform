import { FormatSchema, BaseFieldType, FieldType } from './schema'

type Field = Record<string, any>

export function validateSchema (data: Record<string, any>, schema: FormatSchema, currentPath: string): string[] {
  const { requiredFields: requiredSchema, optionalFields: optionalSchema } = schema

  const dataKeys = Object.keys(data)

  const requiredKeys = Array.from(requiredSchema.keys())
  const missingRequiredKeys = requiredKeys.filter((key) => !dataKeys.includes(key))

  const optionalKeys = Array.from(optionalSchema.keys())
  const presentOptionalKeys = optionalKeys.filter((key) => dataKeys.includes(key))

  const extraKeys = dataKeys.filter((key) => !requiredKeys.includes(key) && !optionalKeys.includes(key))
  const errors: string[] = []

  if (missingRequiredKeys.length > 0) {
    missingRequiredKeys.forEach((key) => {
      errors.push(`Required property ${key} is missing`)
    })
  }

  requiredKeys.forEach((key) => {
    if (dataKeys.includes(key)) {
      const type = requiredSchema.get(key)
      if (type !== undefined) {
        errors.push(...validatePropertyDefinition({ key, value: data[key] }, type, true, currentPath))
      }
    }
  })

  presentOptionalKeys.forEach((key) => {
    const type = optionalSchema.get(key)
    if (type !== undefined) {
      errors.push(...validatePropertyDefinition({ key, value: data[key] }, type, false, currentPath))
    }
  })

  if (extraKeys.length > 0) {
    errors.push(`Extra properties are not allowed: ${extraKeys.join(', ')}`)
  }

  return errors
}

function validatePropertyDefinition (field: Field, type: FieldType, isRequired: boolean, currentPath: string): string[] {
  const errors: string[] = []
  if (isRequired) {
    errors.push(...validateValueNotEmpty(field.value, ''))
  }
  if (type.isArray) {
    errors.push(...validateArray(field.value, type.type, field.key, currentPath))
  } else {
    errors.push(...validateType(field.value, type.type, field.key, currentPath))
  }

  return errors
}

export function validateValueNotEmpty (value: unknown, fieldName: string): string[] {
  const errors: string[] = []
  if (value === undefined || value === null || value === '') {
    errors.push(`${fieldName} is required`)
  }
  return errors
}

export function validateType (value: unknown, type: BaseFieldType, fieldName: string, currentPath: string): string[] {
  const errors: string[] = []
  if (!type.isValid(value, { currentPath })) {
    errors.push(`${fieldName} must be ${type.name}, but got ${typeof value}: ${String(value)}`)
  }
  return errors
}

export function validateArray (
  value: unknown,
  itemType: BaseFieldType,
  fieldName: string,
  currentPath: string
): string[] {
  const errors: string[] = []
  if (!Array.isArray(value)) {
    errors.push(`${fieldName} must be an array`)
    return errors
  }

  for (let i = 0; i < value.length; i++) {
    errors.push(...validateType(value[i], itemType, `${fieldName}[${i}]`, currentPath))
  }

  return errors
}
