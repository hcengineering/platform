<!--
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
-->
<script lang="ts">
  import { ActivityProcess, Markdown } from '@hcengineering/communication-types'
  import { getClient } from '@hcengineering/presentation'
  import { Icon, IconAdd, IconArrowRight, IconCheck, IconStart, Label } from '@hcengineering/ui'
  import processPlugin from '@hcengineering/process'

  export let update: ActivityProcess
  export let content: Markdown

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: _process = client.getModel().findObject(update.process)
  $: state = update.transitionTo !== undefined ? client.getModel().findObject(update.transitionTo) : undefined

  $: icon = update.action === 'started' ? IconStart : update.action === 'transition' ? IconArrowRight : IconCheck
</script>

<div class="tag overflow-label flex-gap-2">
  <Icon {icon} size="small" />
  {#if _process !== undefined}
    {#if update.action === 'started'}
      <Label label={processPlugin.string.ProcessRunned} params={{ process: _process.name }} />
    {:else if state !== undefined}
      <Label
        label={update.action === 'transition'
          ? processPlugin.string.ProcessStateChanged
          : processPlugin.string.ProcessFinished}
        params={{ process: _process.name, state: state.title }}
      />
    {/if}
  {:else}
    {content}
  {/if}
</div>

<style lang="scss">
  .tag {
    display: flex;
    align-items: center;
  }
</style>
