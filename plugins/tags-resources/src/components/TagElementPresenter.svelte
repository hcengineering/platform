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
  import { Asset } from '@hcengineering/platform'
  import { TagElement } from '@hcengineering/tags'
  import { AnySvelteComponent, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import EditTagElement from './EditTagElement.svelte'
  import TagItem from './TagItem.svelte'

  export let value: TagElement
  export let action: Asset | AnySvelteComponent | undefined = undefined
  export let edit: boolean = false
  export let keyTitle: string = ''
</script>

{#if value}
  {#if edit}
    <div
      class="over-underline"
      on:click={(evt) => {
        showPopup(EditTagElement, { value, keyTitle }, eventToHTMLElement(evt))
      }}
    >
      <TagItem element={value} {action} on:action />
    </div>
  {:else}
    <TagItem element={value} {action} on:action />
  {/if}
{/if}
