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

import { type Ref } from '@hcengineering/core'
import drive, { type File } from '@hcengineering/drive'
import {
  previewTypes as $previewTypes,
  FilePreview,
  getClient,
  getPreviewType,
  type FilePreviewExtension
} from '@hcengineering/presentation'
import { type Editor } from '@tiptap/core'
import { SvelteRenderer } from '../../../node-view'
import { parseReferenceUrl } from '../../reference'
import { type EmbedNodeProviderConstructor } from '../embed'
import { setLoadingState } from '../../toolbar/toolbar'

export interface DriveEmbedOptions {
  _x?: number
}

export const defaultDriveEmbedOptions: DriveEmbedOptions = {}

export const DriveEmbedProvider: EmbedNodeProviderConstructor<DriveEmbedOptions> = (options) => ({
  buildView: async (src: string) => {
    const ref = parseReferenceUrl(src)
    if (ref?.objectclass !== drive.class.File || ref.id === undefined) {
      return
    }

    const client = getClient()
    const file = await client.findOne(drive.class.File, { _id: ref.id as Ref<File> })
    if (file === undefined) return

    const version = await client.findOne(drive.class.FileVersion, { attachedTo: file._id, version: file.version })
    if (version === undefined) return

    const allPreviewTypesPromise = new Promise<FilePreviewExtension[]>((resolve) => {
      $previewTypes.subscribe((types) => {
        if (types.length > 0) resolve(types)
      })
    })

    const allPreviewTypes = await allPreviewTypesPromise
    const previewType = await getPreviewType(version.type, allPreviewTypes)

    if (previewType === undefined) return

    return (editor: Editor, root: HTMLDivElement) => {
      const setLoading = (loading: boolean): void => {
        setLoadingState(editor.view, root, loading)
      }
      const renderer = new SvelteRenderer(FilePreview as any, {
        element: root,
        props: {
          file: version.file,
          contentType: version.type,
          name: version.title,
          metadata: version.metadata,
          embedded: true,
          setLoading
        }
      })
      return {
        name: 'drive',
        destroy: () => {
          renderer.destroy()
        }
      }
    }
  }
})
