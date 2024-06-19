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
  import core, { type Ref } from '@hcengineering/core'
  import drive, { type File } from '@hcengineering/drive'
  import { Panel } from '@hcengineering/panel'
  import presentation, { IconDownload, createQuery, getBlobHref } from '@hcengineering/presentation'
  import { Button, Scroller, IconMoreH } from '@hcengineering/ui'
  import { DocAttributeBar, showMenu } from '@hcengineering/view-resources'

  import EditFile from './EditFile.svelte'
  import FileHeader from './FileHeader.svelte'

  export let _id: Ref<File>
  export let readonly: boolean = false
  export let embedded: boolean = false
  export let kind: 'default' | 'modern' = 'default'

  export function canClose (): boolean {
    return false
  }

  let object: File | undefined = undefined
  let download: HTMLAnchorElement

  const query = createQuery()
  $: query.query(
    drive.class.File,
    { _id },
    (res) => {
      ;[object] = res
    },
    {
      lookup: {
        file: core.class.Blob
      }
    }
  )
</script>

{#if object}
  <Panel
    {object}
    {embedded}
    {kind}
    allowClose={!embedded}
    isHeader={false}
    useMaxWidth={false}
    on:open
    on:close
    on:update
  >
    <svelte:fragment slot="title">
      <FileHeader {object} />
    </svelte:fragment>

    <svelte:fragment slot="utils">
      {#await getBlobHref(object.$lookup?.file, object.file, object.name) then href}
        <a class="no-line" {href} download={object.name} bind:this={download}>
          <Button
            icon={IconDownload}
            iconProps={{ size: 'medium' }}
            kind={'icon'}
            on:click={() => {
              download.click()
            }}
            showTooltip={{ label: presentation.string.Download }}
          />
        </a>
      {/await}
      <Button
        icon={IconMoreH}
        iconProps={{ size: 'medium' }}
        kind={'icon'}
        on:click={(ev) => {
          showMenu(ev, { object })
        }}
      />
    </svelte:fragment>

    <svelte:fragment slot="aside">
      <Scroller>
        <DocAttributeBar {object} {readonly} ignoreKeys={[]} />
        <div class="space-divider bottom" />
      </Scroller>
    </svelte:fragment>

    <div class="flex-col flex-grow flex-no-shrink step-tb-6">
      <EditFile {object} {readonly} />
    </div>
  </Panel>
{/if}
