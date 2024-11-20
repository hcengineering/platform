//
// Copyright © 2024 Hardcore Engineering Inc.
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
import communication from '@hcengineering/communication'

export type DataType = 'bigint' | 'bool' | 'text' | 'varchar(255)'

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
    type: 'varchar(255)',
    notNull: true,
    index: false
  },
  _class: {
    type: 'varchar(255)',
    notNull: true,
    index: true
  },
  createdBy: {
    type: 'varchar(255)',
    notNull: true,
    index: false
  },
  createdOn: {
    type: 'varchar(255)',
    notNull: true,
    index: false
  }
}

const messageSchema: Schema = {
  ...baseSchema,
  content: {
    type: 'text',
    notNull: false,
    index: false
  },
  attachedTo: {
    type: 'varchar(255)',
    notNull: true,
    index: true
  },
  attachedToClass: {
    type: 'varchar(255)',
    notNull: true,
    index: false
  }
}

const patchSchema: Schema = {
  ...baseSchema,
  content: {
    type: 'text',
    notNull: false,
    index: false
  },
  attachedTo: {
    type: 'varchar(255)',
    notNull: true,
    index: true
  }
}

const reactionSchema: Schema = {
  ...baseSchema,
  emoji: {
    type: 'text',
    notNull: true,
    index: false
  },
  attachedTo: {
    type: 'varchar(255)',
    notNull: true,
    index: true
  }
}

export const schemaByClass: Record<string, Schema> = {
  [communication.class.Message]: messageSchema,
  [communication.class.Patch]: patchSchema,
  [communication.class.Reaction]: reactionSchema
}

export const tableNameByClass = {
  [communication.class.Message]: 'immut_message',
  [communication.class.Reaction]: 'immut_reaction',
  [communication.class.Patch]: 'immut_patch'
}
