export type ValueType = 'common' | 'array' | 'dataArray'

export type DataType = 'bigint' | 'bool' | 'text' | 'text[]'

export interface FieldSchema {
  type: DataType
  notNull: boolean
  index: boolean
  indexType?: 'btree' | 'gin' | 'gist' | 'brin' | 'hash'
}

export type Schema = Record<string, FieldSchema>

export interface SchemaDiff {
  remove?: Schema
  add?: Schema
}
