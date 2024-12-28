//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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

import { Client, systemAccountUuid, Tx, WorkspaceUuid } from '@hcengineering/core'
import { createClient } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'

/**
 * @public
 *
 * If connectTimeout is set, connect will try to connect only specified amount of time, and will return failure if failed.
 */
export async function connect (
  transactorUrl: string,
  workspace: WorkspaceUuid,
  account?: string,
  extra?: Record<string, string>,
  model?: Tx[],
  connectTimeout: number = 0
): Promise<Client> {
  const token = generateToken(account ?? systemAccountUuid, workspace, extra)
  return await createClient(transactorUrl, token, model, connectTimeout)
}
