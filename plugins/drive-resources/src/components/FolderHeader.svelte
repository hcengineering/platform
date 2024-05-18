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
  import { Button, IconDetails, IconMoreH } from '@hcengineering/ui'
  import { DocsNavigator, showMenu } from '@hcengineering/view-resources'

  import FolderPresenter from './FolderPresenter.svelte'

  export let object: Folder
  export let asideShown: boolean = false

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

<div class="popupPanel-title">
  <div class="popupPanel-title__content">
    <DocsNavigator elements={parents} />
    <div class="title">
      <FolderPresenter value={object} shouldShowAvatar={false} disabled noUnderline />
    </div>
  </div>
  <div class="flex-row-center ml-3 no-print">
    <Button
      icon={IconMoreH}
      iconProps={{ size: 'medium' }}
      kind={'icon'}
      on:click={(ev) => {
        showMenu(ev, { object })
      }}
    />
    <div class="buttons-divider max-h-7 h-7 mx-2 no-print" />
    <Button
      focusIndex={10008}
      icon={IconDetails}
      iconProps={{ size: 'medium', filled: asideShown }}
      kind={'icon'}
      selected={asideShown}
      on:click={() => {
        asideShown = !asideShown
      }}
    />
  </div>
</div>
