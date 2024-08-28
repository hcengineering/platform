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
  import { DocUpdateMessage } from '@hcengineering/activity'
  import chunter, { Channel } from '@hcengineering/chunter'
  import { Label } from '@hcengineering/ui'

  import ChannelIcon from '../ChannelIcon.svelte'

  export let message: DocUpdateMessage
  export let value: Channel | undefined

  $: date = new Date(message.createdOn ?? message.modifiedOn).toLocaleString('default', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
</script>

{#if value}
  <span class="text flex-gap-1 overflow-label">
    <ChannelIcon {value} size="x-small" />
    <Label label={chunter.string.CreatedChannelOn} params={{ date }} />
  </span>
{/if}

<style lang="scss">
  .text {
    display: inline-flex;
    align-items: center;
    color: var(--global-secondary-TextColor);
  }
</style>
