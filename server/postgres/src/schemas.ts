import { DOMAIN_DOC_INDEX_STATE, DOMAIN_MODEL_TX, DOMAIN_SPACE, DOMAIN_TX } from '@hcengineering/core'

export type DataType = 'bigint' | 'bool' | 'text' | 'text[]'

export function getIndex (field: FieldSchema): string {
  if (field.indexType === undefined || field.indexType === 'btree') {
    return ''
  }
  return ` USING ${field.indexType}`
}

export interface FieldSchema {
  type: DataType
  notNull: boolean
  index: boolean
  indexType?: 'btree' | 'gin' | 'gist' | 'brin' | 'hash'
}

export type Schema = Record<string, FieldSchema>

const baseSchema: Schema = {
  _id: {
    type: 'text',
    notNull: true,
    index: false
  },
  _class: {
    type: 'text',
    notNull: true,
    index: true
  },
  space: {
    type: 'text',
    notNull: true,
    index: true
  },
  modifiedBy: {
    type: 'text',
    notNull: true,
    index: false
  },
  createdBy: {
    type: 'text',
    notNull: false,
    index: false
  },
  modifiedOn: {
    type: 'bigint',
    notNull: true,
    index: false
  },
  createdOn: {
    type: 'bigint',
    notNull: false,
    index: false
  },
  '%hash%': {
    type: 'text',
    notNull: false,
    index: false
  }
}

const defaultSchema: Schema = {
  ...baseSchema,
  attachedTo: {
    type: 'text',
    notNull: false,
    index: true
  }
}

const spaceSchema: Schema = {
  ...baseSchema,
  private: {
    type: 'bool',
    notNull: true,
    index: true
  },
  members: {
    type: 'text[]',
    notNull: true,
    index: true,
    indexType: 'gin'
  }
}

const txSchema: Schema = {
  ...defaultSchema,
  objectSpace: {
    type: 'text',
    notNull: true,
    index: true
  },
  objectId: {
    type: 'text',
    notNull: false,
    index: false
  }
}

const notificationSchema: Schema = {
  ...baseSchema,
  isViewed: {
    type: 'bool',
    notNull: true,
    index: true
  },
  archived: {
    type: 'bool',
    notNull: true,
    index: true
  },
  user: {
    type: 'text',
    notNull: true,
    index: true
  }
}

const dncSchema: Schema = {
  ...baseSchema,
  objectId: {
    type: 'text',
    notNull: true,
    index: true
  },
  objectClass: {
    type: 'text',
    notNull: true,
    index: false
  },
  user: {
    type: 'text',
    notNull: true,
    index: true
  }
}

const userNotificationSchema: Schema = {
  ...baseSchema,
  user: {
    type: 'text',
    notNull: true,
    index: true
  }
}

const docIndexStateSchema: Schema = {
  ...baseSchema,
  needIndex: {
    type: 'bool',
    notNull: true,
    index: true
  },
  objectClass: {
    type: 'text',
    notNull: true,
    index: false
  }
}

const timeSchema: Schema = {
  ...baseSchema,
  workslots: {
    type: 'bigint',
    notNull: false,
    index: true
  },
  doneOn: {
    type: 'bigint',
    notNull: false,
    index: true
  },
  user: {
    type: 'text',
    notNull: true,
    index: true
  },
  rank: {
    type: 'text',
    notNull: true,
    index: false
  }
}

const calendarSchema: Schema = {
  ...baseSchema,
  hidden: {
    type: 'bool',
    notNull: true,
    index: true
  }
}

const eventSchema: Schema = {
  ...defaultSchema,
  calendar: {
    type: 'text',
    notNull: true,
    index: true
  },
  date: {
    type: 'bigint',
    notNull: true,
    index: true
  },
  dueDate: {
    type: 'bigint',
    notNull: true,
    index: true
  },
  participants: {
    type: 'text[]',
    notNull: true,
    index: true
  }
}

const docSyncInfo: Schema = {
  ...baseSchema,
  needSync: {
    type: 'text',
    notNull: false,
    index: false
  },
  externalVersion: {
    type: 'text',
    notNull: false,
    index: false
  },
  repository: {
    type: 'text',
    notNull: false,
    index: false
  },
  url: {
    type: 'text',
    notNull: false,
    index: false
  },
  objectClass: {
    type: 'text',
    notNull: false,
    index: false
  },
  deleted: {
    type: 'bool',
    notNull: false,
    index: false
  }
}

export function addSchema (domain: string, schema: Schema): void {
  domainSchemas[translateDomain(domain)] = schema
  domainSchemaFields.set(domain, createSchemaFields(schema))
}

export function translateDomain (domain: string): string {
  return domain.replaceAll('-', '_')
}

export const domainSchemas: Record<string, Schema> = {
  [DOMAIN_SPACE]: spaceSchema,
  [DOMAIN_TX]: txSchema,
  [DOMAIN_MODEL_TX]: txSchema,
  [translateDomain('time')]: timeSchema,
  [translateDomain('calendar')]: calendarSchema,
  [translateDomain('event')]: eventSchema,
  [translateDomain(DOMAIN_DOC_INDEX_STATE)]: docIndexStateSchema,
  notification: notificationSchema,
  [translateDomain('notification-dnc')]: dncSchema,
  [translateDomain('notification-user')]: userNotificationSchema,
  github: docSyncInfo
}

export function getSchema (domain: string): Schema {
  return domainSchemas[translateDomain(domain)] ?? defaultSchema
}

export function getDocFieldsByDomains (domain: string): string[] {
  const schema = domainSchemas[translateDomain(domain)] ?? defaultSchema
  return Object.keys(schema)
}

export interface SchemaAndFields {
  schema: Schema

  fields: string[]
  domainFields: Set<string>
}

function createSchemaFields (schema: Schema): SchemaAndFields {
  const fields = Object.keys(schema)
  const domainFields = new Set(Object.keys(schema))
  return { schema, fields, domainFields }
}

const defaultSchemaFields: SchemaAndFields = createSchemaFields(defaultSchema)

const domainSchemaFields = new Map<string, SchemaAndFields>()
for (const [domain, _schema] of Object.entries(domainSchemas)) {
  domainSchemaFields.set(domain, createSchemaFields(_schema))
}

export function getSchemaAndFields (domain: string): SchemaAndFields {
  return domainSchemaFields.get(translateDomain(domain)) ?? defaultSchemaFields
}
