//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { Hierarchy, ModelDb, WorkspaceId } from '@hcengineering/core'
import { DbAdapter, DummyDbAdapter } from '@hcengineering/server-core'

/**
 * @public
 */
export async function createNullAdapter (
  hierarchy: Hierarchy,
  url: string,
  workspaceId: WorkspaceId,
  modelDb: ModelDb
): Promise<DbAdapter> {
  return new DummyDbAdapter()
}

/**
 * @public
 */
export interface MinioConfig {
  endPoint: string
  accessKey: string
  secretKey: string
}
