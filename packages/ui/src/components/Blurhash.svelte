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
  import { decode } from 'blurhash'
  import { onMount } from 'svelte'

  export let blurhash: string
  export let width = 32
  export let height = 32
  export let punch = 1

  let canvas: HTMLCanvasElement

  $: if (canvas !== undefined) {
    renderBlurhash(canvas, blurhash)
  }

  function renderBlurhash (canvas: HTMLCanvasElement, blurhash: string): void {
    const ctx = canvas.getContext('2d')
    if (ctx !== null) {
      const pixels = decode(blurhash, width, height, punch)
      const imageData = ctx.createImageData(width, height)
      imageData.data.set(pixels)
      ctx.putImageData(imageData, 0, 0)
    }
  }

  onMount(() => {
    if (canvas !== undefined) {
      renderBlurhash(canvas, blurhash)
    }
  })
</script>

<canvas bind:this={canvas} {width} {height} style="width: 100%; height: 100%;" />

<style>
  canvas {
    border-radius: inherit;
    display: block;
  }
</style>
