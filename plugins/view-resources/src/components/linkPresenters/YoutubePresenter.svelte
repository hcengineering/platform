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
  import Play from '../icons/Play.svelte'
  import { getPlatformColor, themeStore } from '@hcengineering/ui'

  export let href: string
  const maxWidth = 400
  const maxHeight = 400
  let height = maxHeight
  let emb: HTMLDivElement | undefined

  interface Data {
    authorUrl: string
    author: string
    thumbnail: string
    title: string
    html: string
  }

  let played = false

  async function getData (href: string): Promise<Data> {
    const res = await (
      await fetch(`https://www.youtube.com/oembed?url=${href}&format=json&maxwidth=${maxWidth}&maxheight=${maxHeight}`)
    ).json()
    height = (res.thumbnail_height / res.thumbnail_width) * maxWidth
    return {
      authorUrl: res.author_url,
      author: res.author_name,
      thumbnail: res.thumbnail_url,
      title: res.title,
      html: res.html
    }
  }

  function setHeigh (emb: HTMLElement): void {
    const child = emb.firstElementChild as HTMLElement
    child.style.height = `${height}px`
    child.setAttribute('height', `${height}px`)
  }

  $: emb && setHeigh(emb)
</script>

<div class="flex mt-2">
  <div class="line" style="background-color: {getPlatformColor(2, $themeStore.dark)}" />
  {#await getData(href) then data}
    <div class="flex-col">
      <div class="mb-1"><a class="fs-title" {href}>{data.title}</a></div>
      <div class="mb-1"><a href={data.authorUrl}>{data.author}</a></div>
      {#if !played}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="container"
          on:click={() => {
            played = true
          }}
        >
          <img width="400px" src={data.thumbnail} alt={data.title} />
          <div class="play-btn"><Play size={'full'} /></div>
        </div>
      {:else}
        <div bind:this={emb}>
          {@html data.html}
        </div>
      {/if}
    </div>
  {/await}
</div>

<style lang="scss">
  .line {
    margin-right: 1rem;
    width: 0.4rem;
    border-radius: 0.25rem;
  }
  .container {
    position: relative;
    cursor: pointer;

    .play-btn {
      position: absolute;
      top: calc(50% - 50px);
      left: calc(50% - 50px);
      height: 100px;
      width: 100px;
    }
  }
</style>
