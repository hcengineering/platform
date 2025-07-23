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
  import { showPopup, StatusBarButton } from '@hcengineering/ui'
  import FileDownloadStatusPopup from './FileDownloadStatusPopup.svelte'
  import IconDownloadProgress from './icons/DownloadProgress.svelte'
  import { downloads, progress } from '../store'

  let pressed: boolean = false
  let element: HTMLElement

  function handleClick (): void {
    pressed = true
    showPopup(FileDownloadStatusPopup, {}, element, () => {
      pressed = false
    })
  }
</script>

{#if $downloads.length > 0}
  <div class="flex-row-center flex-gap-2">
    <StatusBarButton
      bind:element
      icon={IconDownloadProgress}
      iconProps={{ progress: $progress }}
      {pressed}
      on:click={handleClick}
    />
  </div>
{/if}
