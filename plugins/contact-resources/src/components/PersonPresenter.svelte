<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
import { getResource } from '@anticrm/platform'
import { formatName, Person } from '@anticrm/contact'
import { Avatar, getClient } from '@anticrm/presentation'
import { showPopup } from '@anticrm/ui'
import view from '@anticrm/view'

export let value: Person

async function onClick() {
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const clazz = hierarchy.getClass(value._class)
  const editorMixin = hierarchy.as(clazz, view.mixin.ObjectEditor)
  const editor = await getResource(editorMixin.editor) 
  showPopup(editor, { _id: value._id }, 'full')
}
</script>

{#if value}
  <div class="flex-row-center user-container" on:click={onClick}>
    <Avatar size={'x-small'} avatar={value.avatar}/>
    <div class="overflow-label user">{formatName(value.name)}</div>
  </div>
{:else}
  <div class="flex-row-center user-container" on:click={onClick}>
    Not selected
  </div>
{/if}

<style lang="scss">
  .user-container {
    cursor: pointer;
    
    .user {
      margin-left: .5rem;
      font-weight: 500;
      text-align: left;
      color: var(--theme-content-accent-color);
    }
    &:hover .user {
      text-decoration: underline;
      color: var(--theme-caption-color);
    }
  }
</style>
