import { DOMAIN_DOC_INDEX_STATE, DOMAIN_MODEL_TX, DOMAIN_RELATION, DOMAIN_SPACE, DOMAIN_TX } from '@hcengineering/core'
import { type SchemaDiff, type FieldSchema, type Schema } from './types'

export function getIndex (field: FieldSchema): string {
  if (field.indexType === undefined || field.indexType === 'btree') {
    return ''
  }
  return ` USING ${field.indexType}`
}

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
  },
  archived: {
    type: 'bool',
    notNull: true,
    index: true
  }
}

const relationSchema: Schema = {
  ...baseSchema,
  docA: {
    type: 'text',
    notNull: true,
    index: true
  },
  docB: {
    type: 'text',
    notNull: true,
    index: true
  },
  association: {
    type: 'text',
    notNull: true,
    index: true
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
  },
  docNotifyContext: {
    type: 'text',
    notNull: false,
    index: false
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
  ...defaultSchema,
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
  parent: {
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

const githubLogin: Schema = {
  ...baseSchema,
  login: {
    type: 'text',
    notNull: true,
    index: true
  }
}

function addSchema (domain: string, schema: Schema): void {
  domainSchemas[translateDomain(domain)] = schema
  domainSchemaFields.set(domain, createSchemaFields(schema))
}

// add schema if not forced and return migrate script if have differences
export function setSchema (domain: string, schema: Schema): string | undefined {
  const translated = translateDomain(domain)
  if (forcedSchemas.includes(translated)) {
    const diff = getSchemaDiff(translated, schema)
    if (diff !== undefined) {
      return migrateSchema(translated, diff)
    }
  }
  addSchema(translated, schema)
}

function migrateSchema (domain: string, diff: SchemaDiff): string {
  const queries: string[] = []
  if (diff.remove !== undefined) {
    for (const key in diff.remove) {
      const field = diff.remove[key]
      switch (field.type) {
        case 'text':
          queries.push(`UPDATE ${domain} SET data = jsonb_set(data, '{${key}}', to_jsonb("${key}"), true);`)
          break
        case 'text[]':
          queries.push(`UPDATE ${domain} SET data = jsonb_set(data, '{${key}}', to_jsonb("${key}::text[]"), true);`)
          break
        case 'bigint':
          queries.push(`UPDATE ${domain} SET data = jsonb_set(data, '{${key}}', to_jsonb("${key}"::bigint), true);`)
          break
        case 'bool':
          queries.push(`UPDATE ${domain} SET data = jsonb_set(data, '{${key}}', to_jsonb("${key}"::boolean), true);`)
          break
      }
      queries.push(`ALTER TABLE ${domain} DROP COLUMN "${key}"`)
    }
  }
  if (diff.add !== undefined) {
    for (const key in diff.add) {
      const field = diff.add[key]
      queries.push(`ALTER TABLE ${domain} ADD COLUMN "${key}" ${field.type}`)
      queries.push('COMMIT')
      switch (field.type) {
        case 'text':
          queries.push(`UPDATE ${domain} SET "${key}" = (data->>'${key}');`)
          break
        case 'text[]':
          queries.push(`UPDATE ${domain} SET "${key}" = array(
            SELECT jsonb_array_elements_text(data->'${key}')
          )`)
          break
        case 'bigint':
          queries.push(`UPDATE ${domain} SET "${key}" = (data->>'${key}')::bigint;`)
          break
        case 'bool':
          queries.push(`UPDATE ${domain} SET "${key}" = (data->>'${key}')::boolean;`)
          break
      }
      if (field.notNull) {
        queries.push(`ALTER TABLE ${domain} ALTER COLUMN "${key}" SET NOT NULL`)
      }
    }
  }
  return queries.join(';')
}

function getSchemaDiff (domain: string, dbSchema: Schema): SchemaDiff | undefined {
  const domainSchema = getSchema(domain)
  const res: SchemaDiff = {}
  const add: Schema = {}
  const remove: Schema = {}
  for (const key in domainSchema) {
    if (dbSchema[key] === undefined) {
      add[key] = domainSchema[key]
    }
  }
  for (const key in dbSchema) {
    if (domainSchema[key] === undefined) {
      remove[key] = dbSchema[key]
    }
  }
  if (Object.keys(add).length > 0) {
    res.add = add
  }
  if (Object.keys(remove).length > 0) {
    res.remove = remove
  }
  return Object.keys(res).length > 0 ? res : undefined
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
  [translateDomain('github_sync')]: docSyncInfo,
  [translateDomain('github_user')]: githubLogin,
  [DOMAIN_RELATION]: relationSchema,
  kanban: defaultSchema
}

const forcedSchemas: string[] = Object.keys(domainSchemas)

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
