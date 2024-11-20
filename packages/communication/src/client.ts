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

import { Obj, Ref, Class, Data, Query, Options, Message, RichMessage } from './types'
import { generateId } from './utils'
import plugin from './plugin'

export interface ConnectionClient {
  findCommunication: <T extends Obj>(_class: Ref<Class<T>>, query: Query<T>, options?: Options<T>) => Promise<T[]>
  createCommunication: <T extends Obj>(object: T) => Promise<void>
}

export interface CommunicationClient {
  findOne: <T extends Obj>(_class: Ref<Class<T>>, query: Query<T>, options?: Options<T>) => Promise<T | undefined>
  findAll: <T extends Obj>(_class: Ref<Class<T>>, query: Query<T>, options?: Options<T>) => Promise<T[]>
  findMessages: (query: Query<Message>, options?: Options<Message>) => Promise<RichMessage[]>
  create: <T extends Obj>(_class: Ref<Class<T>>, data: Data<T>, createdBy: string) => Promise<Ref<T>>
}

class CommunicationClientImpl implements CommunicationClient {
  constructor (private readonly client: ConnectionClient) {}

  async findOne<T extends Obj>(_class: Ref<Class<T>>, query: Query<T>, options?: Options<T>): Promise<T | undefined> {
    return (await this.findAll(_class, query, { ...options, limit: 1 }))[0]
  }

  async findAll<T extends Obj>(_class: Ref<Class<T>>, query: Query<T>, options?: Options<T>): Promise<T[]> {
    return await this.client.findCommunication(_class, query, options)
  }

  async findMessages (query: Query<Message>, options?: Options<Message>): Promise<RichMessage[]> {
    return (await this.client.findCommunication(plugin.class.Message, query, options)) as RichMessage[]
  }

  async create<T extends Obj>(_class: Ref<Class<T>>, data: Data<T>, createdBy: string): Promise<Ref<T>> {
    const _id = generateId<T>()
    const object: Obj = {
      ...data,
      createdBy,
      _class,
      _id
    }

    await this.client.createCommunication(object)
    return _id
  }
}

let client: CommunicationClient

export function getCommunicationClient (): CommunicationClient {
  return client
}

export function setCommunicationClient (_client: ConnectionClient): void {
  client = new CommunicationClientImpl(_client)
}
