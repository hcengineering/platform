<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
  import { getBlobRef } from '@hcengineering/presentation'

  import { getCustomEmoji } from '../utils'

  export let emoji: string = ''
  export let fitSize: boolean = false
  export let center: boolean = false

  $: customEmoji = getCustomEmoji(emoji)
</script>

{#if customEmoji === undefined}
  {emoji}
{:else}
  {@const alt = emoji}
  {#await getBlobRef(customEmoji.image) then blobSrc}
    <span class="emoji noMargin" class:fitSize class:center>
      <img src={blobSrc.src} {alt} />
    </span>
  {/await}
{/if}
