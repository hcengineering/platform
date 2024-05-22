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
  import { type Ref } from '@hcengineering/core'
  import drive, { type Folder } from '@hcengineering/drive'
  import { createQuery } from '@hcengineering/presentation'
  import { Separator } from '@hcengineering/ui'
  import { DocAttributeBar } from '@hcengineering/view-resources'

  import FolderHeader from './FolderHeader.svelte'
  import FolderBrowser from './FolderBrowser.svelte'

  export let _id: Ref<Folder>
  export let readonly: boolean = false
  export let embedded: boolean = false
  export let kind: 'default' | 'modern' = 'default'

  export function canClose (): boolean {
    return false
  }

  let object: Folder | undefined = undefined
  let asideShown = false

  const query = createQuery()
  $: query.query(drive.class.Folder, { _id }, (res) => {
    ;[object] = res
  })
</script>

{#if object}
  <div class="popupPanel panel {kind}" class:embedded>
    <FolderHeader {object} bind:asideShown />

    <div class="popupPanel-body">
      <div class="popupPanel-body__main">
        <FolderBrowser space={object.space} parent={object._id} {readonly} />
      </div>

      {#if asideShown}
        <Separator name="aside" float={false} index={0} />
        <div class="popupPanel-body__aside no-print" class:shown={asideShown}>
          <Separator name={'panel-aside'} float={true} index={0} />
          <div class="antiPanel-wrap__content">
            <DocAttributeBar {object} {readonly} ignoreKeys={[]} />
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
