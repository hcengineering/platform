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

import { MeasureContext } from '@hcengineering/core'
import type { StorageAdapter } from '@hcengineering/server-core'
import { Hocuspocus } from '@hocuspocus/server'
import { Transformer } from '@hocuspocus/transformer'
import { Context } from '../context'

export interface RpcRequest {
  method: string
  payload: object
}

export interface RpcErrorResponse {
  error: string
}

export type RpcResponse = object | RpcErrorResponse

export type RpcMethod = (
  ctx: MeasureContext,
  context: Context,
  payload: any,
  params: RpcMethodParams
) => Promise<RpcResponse>

export interface RpcMethodParams {
  hocuspocus: Hocuspocus
  storage: StorageAdapter
  transformer: Transformer
}
