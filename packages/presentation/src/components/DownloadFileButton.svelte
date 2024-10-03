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
  import type { Ref, Blob } from '@hcengineering/core'
  import { Button } from '@hcengineering/ui'

  import { getFileUrl } from '../file'
  import Download from './icons/Download.svelte'
  import presentation from '../plugin'

  export let file: Ref<Blob> | undefined
  export let name: string

  let download: HTMLAnchorElement
  $: srcRef = file !== undefined ? getFileUrl(file, name) : undefined
</script>

{#await srcRef then src}
  {#if src !== ''}
    <a class="no-line" href={src} download={name} bind:this={download}>
      <Button
        icon={Download}
        kind={'icon'}
        on:click={() => {
          download.click()
        }}
        showTooltip={{ label: presentation.string.Download }}
      />
    </a>
  {/if}
{/await}
