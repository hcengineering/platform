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
  import workbench, { Widget, WidgetTab } from '@hcengineering/workbench'
  import { FilePreview, DownloadFileButton, FilePreviewPopup, FileTypeIcon } from '@hcengineering/presentation'
  import { Breadcrumbs, Button, closeTooltip, Header, IconOpen, showPopup } from '@hcengineering/ui'
  import { getResource } from '@hcengineering/platform'
  import view from '@hcengineering/view'

  import attachment from '../plugin'

  export let widget: Widget
  export let tab: WidgetTab

  $: file = tab.data?.file
  $: fileName = tab.data?.name ?? ''
  $: contentType = tab.data?.contentType
  $: metadata = tab.data?.metadata

  async function closeTab (): Promise<void> {
    const fn = await getResource(workbench.function.CloseWidgetTab)
    await fn(widget, tab.id)
  }
</script>

<Header
  allowFullsize={false}
  type="type-aside"
  hideBefore={true}
  hideActions={false}
  hideDescription={true}
  adaptive="disabled"
  closeOnEscape={false}
  on:close={closeTab}
>
  <Breadcrumbs
    items={[{ title: fileName, icon: FileTypeIcon, iconProps: { name: fileName }, iconMargin: '0 0.5rem 0 0' }]}
    currentOnly
  />
  <svelte:fragment slot="actions">
    <DownloadFileButton name={fileName} {file} />
    <Button
      icon={view.icon.Open}
      kind="icon"
      showTooltip={{ label: attachment.string.OpenInWindow }}
      on:click={() => {
        closeTooltip()
        showPopup(FilePreviewPopup, { file, name: fileName, contentType, metadata }, 'centered')
      }}
    />
  </svelte:fragment>
</Header>

{#if file}
  <FilePreview {file} {contentType} name={fileName} {metadata} />
{/if}
