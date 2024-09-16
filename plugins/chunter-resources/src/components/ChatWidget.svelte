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
  import { closeWidget, closeWidgetTab } from '@hcengineering/workbench-resources'
  import { Widget } from '@hcengineering/workbench'
  import { ChatWidgetTab } from '@hcengineering/chunter'

  import ChannelSidebarView from './ChannelSidebarView.svelte'
  import chunter from '../plugin'
  import ThreadSidebarView from './threads/ThreadSidebarView.svelte'

  export let widget: Widget | undefined
  export let tab: ChatWidgetTab | undefined
  export let height: string
  export let width: string

  function handleClose (tabId?: string): void {
    if (widget === undefined || tabId === undefined) return
    void closeWidgetTab(widget, tabId)
  }

  $: if (widget === undefined || tab === undefined) {
    closeWidget(chunter.ids.ChatWidget)
  }
</script>

{#if widget && tab && tab.type === 'channel'}
  <ChannelSidebarView
    {widget}
    {tab}
    {height}
    {width}
    on:close={() => {
      handleClose(tab?.id)
    }}
  />
{:else if widget && tab && tab.type === 'thread'}
  <ThreadSidebarView
    {tab}
    {height}
    {width}
    on:close={() => {
      handleClose(tab?.id)
    }}
  />
{/if}
