/**
 * @public
 */
export interface BitrixProfile {
  ID: string
  ADMIN: boolean
  NAME: string
  LAST_NAME: string
  PERSONAL_GENDER: string
  PERSONAL_PHOTO: string
  TIME_ZONE: string
  TIME_ZONE_OFFSET: number
}

export type NumberString = string
export type ISODate = string
export type BoolString = 'Y' | 'N'
export type GenderString = 'M' | 'F' | ''

export interface MultiField {
  readonly ID: NumberString
  readonly VALUE_TYPE: string
  readonly VALUE: string
  readonly TYPE_ID: string
}
export type MultiFieldArray = ReadonlyArray<Pick<MultiField, 'VALUE' | 'VALUE_TYPE'>>

export interface StatusValue {
  CATEGORY_ID: string | null
  COLOR: string | null
  ENTITY_ID: string | null
  ID: number
  NAME: string
  NAME_INIT: string | null
  SEMANTICS: string | null
  SORT: string | null
  STATUS_ID: string | null
  SYSTEM: 'Y' | 'N'
}

export interface BitrixResult {
  result: any
  next: number
  total: number
}
