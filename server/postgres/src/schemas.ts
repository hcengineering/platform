import { DOMAIN_SPACE } from '@hcengineering/core'

type DataType = 'bigint' | 'bool' | 'text' | 'text[]'

type Schema = Record<string, [DataType, boolean]>

export const defaultSchema: Schema = {
  _id: ['text', true],
  _class: ['text', true],
  space: ['text', true],
  modifiedBy: ['text', true],
  createdBy: ['text', false],
  modifiedOn: ['bigint', true],
  createdOn: ['bigint', false],
  attachedTo: ['text', false]
}

export const spaceSchema: Schema = {
  _id: ['text', true],
  _class: ['text', true],
  space: ['text', true],
  modifiedBy: ['text', true],
  createdBy: ['text', false],
  modifiedOn: ['bigint', true],
  createdOn: ['bigint', false],
  private: ['bool', true],
  members: ['text[]', true]
}

export const domainSchemas: Record<string, Schema> = {
  [DOMAIN_SPACE]: spaceSchema
}

export function getSchema (domain: string): Schema {
  return domainSchemas[domain] ?? defaultSchema
}
