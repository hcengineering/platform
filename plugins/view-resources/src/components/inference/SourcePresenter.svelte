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
  import { Doc, WithLookup } from '@hcengineering/core'
  import { IndexedDocumentPreview } from '@hcengineering/presentation'
  import { showPopup, tooltip } from '@hcengineering/ui'
  import plugin from '../../plugin'

  export let value: WithLookup<Doc>
  export let search: string
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<span
  use:tooltip={{ label: plugin.string.ShowPreviewOnClick }}
  on:click={() => {
    showPopup(IndexedDocumentPreview, { objectId: value._id, search }, 'centered')
  }}
>
  {#if value.$source?.$score}
    {Math.round(value.$source?.$score * 100) / 100}
  {:else}
    *
  {/if}
</span>
