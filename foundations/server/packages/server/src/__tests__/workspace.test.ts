//
// Copyright © 2026 Intabia Fusion.
// Copyright © 2026 TraceX SAS.
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

import type { MeasureContext, WorkspaceIds } from '@hcengineering/core'
import type { Pipeline } from '@hcengineering/server-core'

import { Workspace } from '../workspace'

describe('Workspace.with', () => {
  it('retries pipeline creation after a failed build', async () => {
    const pipeline = {} as unknown as Pipeline
    const factory = jest.fn().mockRejectedValueOnce(new Error('build failed')).mockResolvedValueOnce(pipeline)
    const workspace = new Workspace(
      {} as unknown as MeasureContext,
      'token',
      factory,
      0,
      0,
      {} as unknown as WorkspaceIds,
      null
    )

    await expect(workspace.with(async () => 1)).rejects.toThrow('build failed')
    expect(await workspace.with(async (currentPipeline) => currentPipeline)).toBe(pipeline)
    expect(factory).toHaveBeenCalledTimes(2)
    expect(workspace.operations).toBe(0)
  })
})
