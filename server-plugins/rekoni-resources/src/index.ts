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

import { MeasureContext, WorkspaceId } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import { ContentAdapter } from '@hcengineering/server-core'
import serverRekoni from '@hcengineering/server-rekoni'
import { createRekoniAdapter } from './rekoni'

async function RekoniContentAdapterFactory (workspace: WorkspaceId, context: MeasureContext): Promise<ContentAdapter> {
  const rekoniUrl = getMetadata(serverRekoni.metadata.RekoniUrl) ?? ''
  return await createRekoniAdapter(rekoniUrl, workspace, context)
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  function: {
    RekoniContentAdapterFactory
  }
})
