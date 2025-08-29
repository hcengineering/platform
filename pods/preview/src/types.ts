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

export interface PreviewFile {
  filePath: string
  mimeType: string
}

export interface ThumbnailPreviewMetadata {
  width?: number
  height?: number
  blurhash?: string
}

export interface PreviewMetadata {
  thumbnail?: ThumbnailPreviewMetadata
}

export interface PreviewProvider {
  supports: (contentType: string) => boolean

  metadata: (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    name: string,
    contentType: string
  ) => Promise<PreviewMetadata>

  image: (ctx: MeasureContext, workspace: WorkspaceUuid, name: string, contentType: string) => Promise<PreviewFile>
}
