import { DOMAIN_DOC_INDEX_STATE, DOMAIN_SPACE, DOMAIN_TX } from '@hcengineering/core'
import { translateDomain } from './utils'

type DataType = 'bigint' | 'bool' | 'text' | 'text[]'

type Schema = Record<string, [DataType, boolean]>

const baseSchema: Schema = {
  _id: ['text', true],
  _class: ['text', true],
  space: ['text', true],
  modifiedBy: ['text', true],
  createdBy: ['text', false],
  modifiedOn: ['bigint', true],
  createdOn: ['bigint', false],
  '%hash%': ['text', false]
}

const defaultSchema: Schema = {
  ...baseSchema,
  attachedTo: ['text', false]
}

const spaceSchema: Schema = {
  ...baseSchema,
  private: ['bool', true],
  members: ['text[]', true]
}

const txSchema: Schema = {
  ...baseSchema,
  objectSpace: ['text', true],
  objectId: ['text', false]
}

const notificationSchema: Schema = {
  ...baseSchema,
  isViewed: ['bool', true],
  archived: ['bool', true],
  user: ['text', true]
}

const dncSchema: Schema = {
  ...baseSchema,
  objectId: ['text', true],
  objectClass: ['text', true],
  user: ['text', true]
}

const userNotificationSchema: Schema = {
  ...baseSchema,
  user: ['text', true]
}

const docIndexStateSchema: Schema = {
  ...baseSchema,
  needIndex: ['bool', true]
}

export const domainSchemas: Record<string, Schema> = {
  [DOMAIN_SPACE]: spaceSchema,
  [DOMAIN_TX]: txSchema,
  [translateDomain(DOMAIN_DOC_INDEX_STATE)]: docIndexStateSchema,
  notification: notificationSchema,
  [translateDomain('notification-dnc')]: dncSchema,
  [translateDomain('notification-user')]: userNotificationSchema
}

export function getSchema (domain: string): Schema {
  return domainSchemas[translateDomain(domain)] ?? defaultSchema
}

export function getDocFieldsByDomains (domain: string): string[] {
  const schema = domainSchemas[translateDomain(domain)] ?? defaultSchema
  return Object.keys(schema)
}
