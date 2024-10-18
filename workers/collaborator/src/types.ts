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

import { type IRequestStrict } from 'itty-router'

export type DocumentRequest = {
  documentId: string
} & IRequestStrict

// https://github.com/yjs/y-protocols/blob/master/awareness.js#L134
export interface AwarenessUpdate {
  added: Array<number>
  updated: Array<number>
  removed: Array<number>
}

export type RpcRequest = RpcGetContentRequest | RpcUpdateContentRequest

export interface RpcGetContentRequest {
  method: 'getContent'
}

export interface RpcUpdateContentRequest {
  method: 'updateContent'
  payload: RpcUpdateContentPayload
}

export interface RpcUpdateContentPayload {
  content: Record<string, string>
}
