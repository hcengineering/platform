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

import type { Account, MeasureContext } from '@hcengineering/core'
import type { DbAdapter, EventResult, RequestEvent } from '@hcengineering/communication-sdk-types'
import type { WorkspaceID } from '@hcengineering/communication-types'

import type { Metadata } from './metadata'

export interface TriggerCtx {
  ctx: MeasureContext
  metadata: Metadata
  db: DbAdapter
  workspace: WorkspaceID
  account: Account
  execute: (event: RequestEvent) => Promise<EventResult>
}

export type QueryId = string | number
