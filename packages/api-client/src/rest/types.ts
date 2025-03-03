//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { EventResult, RequestEvent as CommunicationEvent } from '@hcengineering/communication-sdk-types'
import {
  FindMessagesGroupsParams,
  FindMessagesParams,
  Message,
  MessagesGroup
} from '@hcengineering/communication-types'
import {
  type Account,
  type Class,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type Hierarchy,
  type ModelDb,
  type Ref,
  type Storage,
  type WithLookup
} from '@hcengineering/core'

export interface RestClient extends Storage, CommunicationRestClient {
  getAccount: () => Promise<Account>

  findOne: <T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ) => Promise<WithLookup<T> | undefined>

  getModel: () => Promise<{ hierarchy: Hierarchy, model: ModelDb }>
}

interface CommunicationRestClient {
  findMessages: (params: FindMessagesParams) => Promise<Message[]>
  findGroups: (params: FindMessagesGroupsParams) => Promise<MessagesGroup[]>
  event: (event: CommunicationEvent) => Promise<EventResult>
}
