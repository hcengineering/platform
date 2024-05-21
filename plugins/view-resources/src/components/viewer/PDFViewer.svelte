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
  import { type Blob, type Ref } from '@hcengineering/core'
  import { type BlobMetadata, getFileUrl } from '@hcengineering/presentation'

  export let value: Ref<Blob>
  export let name: string
  export let contentType: string
  export let metadata: BlobMetadata | undefined
  export let css: string | undefined = undefined

  $: src = value === undefined ? '' : getFileUrl(value, 'full', name)

  let frame: HTMLIFrameElement | undefined = undefined
  // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
  $: if (css !== undefined && frame !== undefined && frame !== null) {
    frame.onload = () => {
      const head = frame?.contentDocument?.querySelector('head')

      // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
      if (css !== undefined && head !== undefined && head !== null) {
        head.appendChild(document.createElement('style')).textContent = css
      }
    }
  }
</script>

{#if src}
  <iframe bind:this={frame} src={src + '#view=FitH&navpanes=0'} class="w-full h-full" title={name} />
{/if}
