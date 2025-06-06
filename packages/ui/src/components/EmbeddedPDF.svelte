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
  import { onDestroy } from 'svelte'
  import Loading from './Loading.svelte'

  export let src: string
  export let name: string
  export let fit: boolean = false
  export let css: string | undefined = undefined

  let iframeSrc: string | undefined = undefined

  async function loadFile (src: string): Promise<void> {
    if (iframeSrc !== undefined) {
      URL.revokeObjectURL(iframeSrc)
      iframeSrc = undefined
    }

    const response = await fetch(src)
    const blob = await response.blob()
    iframeSrc = URL.createObjectURL(blob)
  }

  $: void loadFile(src)

  let iframe: HTMLIFrameElement | undefined = undefined

  // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
  $: if (css !== undefined && iframe !== undefined && iframe !== null) {
    iframe.onload = () => {
      const head = iframe?.contentDocument?.querySelector('head')

      // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
      if (css !== undefined && head !== undefined && head !== null) {
        head.appendChild(document.createElement('style')).textContent = css
      }
    }

    if (iframe.contentDocument !== undefined) {
      const style = iframe.contentDocument?.querySelector('head style')

      if (style != null) {
        style.textContent = css
      }
    }
  }

  onDestroy(() => {
    if (iframeSrc !== undefined) {
      URL.revokeObjectURL(iframeSrc)
    }
  })
</script>

{#if iframeSrc}
  <iframe bind:this={iframe} class:fit src={iframeSrc + '#view=FitH&navpanes=0'} title={name} on:load />
{:else}
  <Loading />
{/if}

<style lang="scss">
  iframe {
    width: 100%;
    border: none;

    &.fit {
      min-height: 100%;
    }
    &:not(.fit) {
      height: 80vh;
      min-height: 20rem;
    }
  }
</style>
