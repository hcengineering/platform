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
  import { Blob, Class, Doc, Ref } from '@hcengineering/core'
  import { AttrValue, MarkupNode, MarkupNodeType, MarkupMarkType } from '@hcengineering/text'

  import LiteNodes from './LiteNodes.svelte'
  import ObjectNode from '../ObjectNode.svelte'
  import NodeMarks from '../NodeMarks.svelte'
  import { getBlobRef } from '../../../preview'
  import { ParsedTextWithEmojis } from '@hcengineering/emoji'

  export let node: MarkupNode
  export let colorInherit: boolean = false
  export let parseEmojisFunction: ((text: string) => ParsedTextWithEmojis) | undefined = undefined

  let parsedTextWithEmojis: ParsedTextWithEmojis | undefined = undefined

  function toRefBlob (blobId: AttrValue): Ref<Blob> {
    return blobId as Ref<Blob>
  }

  function toRef (objectId: string): Ref<Doc> {
    return objectId as Ref<Doc>
  }

  function toClassRef (objectClass: string): Ref<Class<Doc>> {
    if (objectClass === 'contact:class:Employee') {
      return 'contact:mixin:Employee' as Ref<Class<Doc>>
    }
    return objectClass as Ref<Class<Doc>>
  }

  function toString (value: AttrValue | undefined): string | undefined {
    return value != null ? `${value}` : undefined
  }

  $: if (node.type === MarkupNodeType.text && parseEmojisFunction) {
    parsedTextWithEmojis = parseEmojisFunction(node.text ?? '')
  }
</script>

{#if node}
  {@const attrs = node.attrs ?? {}}
  {@const nodes = node.content ?? []}

  {#if node.type === MarkupNodeType.doc}
    <LiteNodes {nodes} {parseEmojisFunction} {colorInherit} />
  {:else if node.type === MarkupNodeType.text}
    {#if parsedTextWithEmojis === undefined}
      {node.text}
    {:else}
      {#each parsedTextWithEmojis.nodes as textOrEmoji}
        {#if typeof textOrEmoji === 'string'}
          {textOrEmoji}
        {:else}
          <span class="emoji" style="display: inline-block">
            {#if 'image' in textOrEmoji}
              {@const blob = toRefBlob(textOrEmoji.image)}
              {@const alt = toString(textOrEmoji.emoji)}
              {#await getBlobRef(blob) then blobSrc}
                <img src={blobSrc.src} {alt} />
              {/await}
            {:else}
              {textOrEmoji.emoji}
            {/if}
          </span>
        {/if}
      {/each}
    {/if}
  {:else if node.type === MarkupNodeType.paragraph}
    <p class="p-inline" class:overflow-label={true} style:margin="0" class:contrast={!colorInherit} class:colorInherit>
      <LiteNodes {nodes} {parseEmojisFunction} {colorInherit} />
    </p>
  {:else if node.type === MarkupNodeType.blockquote}
    <LiteNodes {nodes} {parseEmojisFunction} {colorInherit} />
  {:else if node.type === MarkupNodeType.horizontal_rule}
    <!--  nothing-->
  {:else if node.type === MarkupNodeType.code_block}
    <p class="p-inline contrast" class:overflow-label={true} style:margin="0">
      <NodeMarks
        marks={[
          {
            type: MarkupMarkType.code,
            attrs: {}
          }
        ]}
      >
        <LiteNodes {nodes} {parseEmojisFunction} {colorInherit} />
      </NodeMarks>
    </p>
  {:else if node.type === MarkupNodeType.reference}
    {@const objectId = toString(attrs.id)}
    {@const objectClass = toString(attrs.objectclass)}
    {@const objectLabel = toString(attrs.label)}

    {#if objectClass !== undefined && objectId !== undefined}
      <ObjectNode _id={toRef(objectId)} _class={toClassRef(objectClass)} title={objectLabel} />
    {:else}
      <LiteNodes {nodes} {parseEmojisFunction} {colorInherit} />
    {/if}
  {:else if node.type === MarkupNodeType.emoji}
    <span class="emoji">
      {#if node.attrs?.kind === 'image'}
        {@const blob = toRefBlob(attrs.image)}
        {@const alt = toString(attrs.emoji)}
        {#await getBlobRef(blob) then blobSrc}
          <img src={blobSrc.src} {alt} />
        {/await}
      {:else}
        {node.attrs?.emoji}
      {/if}
    </span>
  {:else if node.type === MarkupNodeType.taskList}
    <!-- TODO not implemented -->
  {:else if node.type === MarkupNodeType.taskItem}
    <!-- TODO not implemented -->
  {:else if node.type === MarkupNodeType.subLink}
    <sub>
      <LiteNodes {nodes} {parseEmojisFunction} {colorInherit} />
    </sub>
  {:else}
    <LiteNodes {nodes} {parseEmojisFunction} {colorInherit} />
  {/if}
{/if}

<style lang="scss">
  .colorInherit {
    color: inherit;
  }
</style>
