<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { formatName, Person } from '@anticrm/contact'
  import { Hierarchy } from '@anticrm/core'
  import { Avatar } from '@anticrm/presentation'
  import { showPanel } from '@anticrm/ui'
  import view from '@anticrm/view'

  export let value: Person | undefined
  export let inline: boolean = false
  export let shouldShowName = true
  export let shouldShowPlaceholder = false

  const avatarSize = 'x-small'

  const onClick = async () => {
    if (value) {
      showPanel(view.component.EditDoc, value._id, Hierarchy.mixinOrClass(value), 'full')
    }
  }
</script>

{#if value || shouldShowPlaceholder}
  {#if value}
    <a
      class="flex-presenter"
      class:inline-presenter={inline}
      href="#{encodeURIComponent([view.component.EditDoc, value._id, Hierarchy.mixinOrClass(value)].join('|'))}"
      on:click={onClick}
    >
      <div class="icon">
        <Avatar size={avatarSize} avatar={value?.avatar} />
      </div>
      {#if shouldShowName}
        <span class="label">{formatName(value.name)}</span>
      {/if}
    </a>
  {:else}
    <div class="icon">
      <Avatar size={avatarSize} avatar={undefined} />
    </div>
  {/if}
{/if}
