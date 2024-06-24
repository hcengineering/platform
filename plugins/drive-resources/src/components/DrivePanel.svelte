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
  import drive, { type Drive } from '@hcengineering/drive'
  import { createQuery } from '@hcengineering/presentation'
  import { Panel, Scroller, Button, IconMoreH } from '@hcengineering/ui'
  import { DocAttributeBar, showMenu } from '@hcengineering/view-resources'

  import DrivePresenter from './DrivePresenter.svelte'
  import FolderBrowser from './FolderBrowser.svelte'

  export let _id: Ref<Drive>
  export let readonly: boolean = false
  export let embedded: boolean = false
  export let kind: 'default' | 'modern' = 'default'

  export function canClose (): boolean {
    return false
  }

  let object: Drive | undefined = undefined

  const query = createQuery()
  $: query.query(drive.class.Drive, { _id }, (res) => {
    ;[object] = res
  })
</script>

{#if object}
  <Panel {embedded} allowClose={false} {kind} selectedAside={false}>
    <svelte:fragment slot="title">
      <div class="title">
        <DrivePresenter value={object} shouldShowAvatar={false} disabled noUnderline />
      </div>
    </svelte:fragment>
    <svelte:fragment slot="utils">
      <Button
        icon={IconMoreH}
        iconProps={{ size: 'medium' }}
        kind={'icon'}
        on:click={(ev) => {
          showMenu(ev, { object })
        }}
      />
      <div class="buttons-divider max-h-7 h-7 mx-2 no-print" />
    </svelte:fragment>
    <svelte:fragment slot="aside">
      <Scroller>
        <DocAttributeBar {object} {readonly} ignoreKeys={[]} />
        <div class="space-divider bottom" />
      </Scroller>
    </svelte:fragment>

    <FolderBrowser
      space={object._id}
      parent={drive.ids.Root}
      on:contextmenu={(evt) => {
        showMenu(evt, { object })
      }}
    />
  </Panel>
{/if}
