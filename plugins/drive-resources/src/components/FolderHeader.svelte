<!--
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
-->
<script lang="ts">
  import { toIdMap, type Doc, type Ref } from '@hcengineering/core'
  import drive, { type Folder } from '@hcengineering/drive'
  import { getClient } from '@hcengineering/presentation'
  import { DocsNavigator } from '@hcengineering/view-resources'

  import FolderPresenter from './FolderPresenter.svelte'

  export let object: Folder

  const client = getClient()

  let parents: Doc[] = []
  $: void updateParents(object.path)

  async function updateParents (path: Ref<Folder>[]): Promise<void> {
    const docs: Array<Doc> = []

    const folders = await client.findAll(drive.class.Folder, { _id: { $in: path } })
    const byId = toIdMap(folders)
    for (const p of path) {
      const parent = byId.get(p)
      if (parent !== undefined) {
        docs.push(parent)
      }
    }

    const root = await client.findOne(drive.class.Drive, { _id: object.space })
    if (root !== undefined) {
      docs.push(root)
    }

    parents = docs.reverse()
  }
</script>

<DocsNavigator elements={parents} />
<div class="title">
  <FolderPresenter value={object} shouldShowAvatar={false} disabled noUnderline />
</div>
