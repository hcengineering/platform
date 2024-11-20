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

import { type Obj, type Class, type Query, type Options, type Ref } from '@hcengineering/communication'

export interface PipelineContext {
  workspace: string
  dbUrl: string
}

export interface Pipeline {
  context: PipelineContext

  create: (object: Obj) => Promise<void>
  findAll: <T extends Obj>(_class: Ref<Class<T>>, query: Query<T>, options?: Options<T>) => Promise<T[]>
  broadcast: (obj: Obj) => Promise<void>

  close: () => Promise<void>
}

export type PipelineFactory = (workspace: string, broadcast: (obj: Obj) => Promise<void>) => Promise<Pipeline>
