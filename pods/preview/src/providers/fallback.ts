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

import { type MeasureContext, type WorkspaceUuid } from '@hcengineering/core'

import { type PreviewFile, type PreviewMetadata, type PreviewProvider } from '../types'

export class FallbackProvider implements PreviewProvider {
  constructor (private readonly target: PreviewProvider) {}

  supports (contentType: string): boolean {
    return true
  }

  async image (ctx: MeasureContext, workspace: WorkspaceUuid, name: string, contentType: string): Promise<PreviewFile> {
    return await this.target.image(ctx, workspace, name, contentType)
  }

  async metadata (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    name: string,
    contentType: string
  ): Promise<PreviewMetadata> {
    return await this.target.metadata(ctx, workspace, name, contentType)
  }
}
