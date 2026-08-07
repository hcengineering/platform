//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { concatLink, type Ref } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import { getCurrentLocation, locationToUrl, type Location } from '@hcengineering/ui'
import drive, { type File } from '@hcengineering/drive'
import presentation, { FilePreview, getClient } from '@hcengineering/presentation'
import { type Editor } from '@tiptap/core'
import { SvelteRenderer } from '../../../node-view'
import { parseReferenceUrl } from '../../reference'
import { type EmbedNodeProvider } from '../embed'
import { setLoadingState } from '../../toolbar/toolbar'

export const DriveEmbedProvider = (): EmbedNodeProvider => ({
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

    const location: Location = {
      path: ['workbench', getCurrentLocation().path[1], 'drive', 'file', file._id]
    }
    const sourceLink = concatLink(
      getMetadata(presentation.metadata.FrontUrl) ?? window.location.origin,
      locationToUrl(location)
    )

    const allPreviewTypes = await allPreviewTypesPromise
    const previewType = await getPreviewType(version.type, allPreviewTypes)

    if (previewType === undefined) return

    return (editor: Editor, root: HTMLDivElement, getPos: () => number, context: Map<unknown, unknown>) => {
      const setLoading = (loading: boolean): void => {
        const pos = getPos()
        if (pos === undefined) return

        setLoadingState(editor.view, pos, loading)
      }
      const renderer = new SvelteRenderer(FilePreview, {
        element: root,
        context,
        props: {
          file: version.file,
          contentType: version.type,
          name: version.title,
          metadata: version.metadata,
          embedded: true,
          props: { sourceLink },
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
