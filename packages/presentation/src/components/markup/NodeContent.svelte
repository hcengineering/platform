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
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { AttrValue, MarkupNode, MarkupNodeType } from '@hcengineering/text'

  import CodeBlockNode from './CodeBlockNode.svelte'
  import ObjectNode from './ObjectNode.svelte'
  import Node from './Node.svelte'

  export let node: MarkupNode
  export let preview = false

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

  function toNumber (value: AttrValue | undefined): number | undefined {
    if (typeof value === 'boolean') {
      return value ? 1 : 0
    }

    return value != null ? (typeof value === 'string' ? parseInt(value) : value) : undefined
  }

  const checkEmoji = (nodes: MarkupNode[]): boolean => {
    const matches: boolean[] = []
    nodes.forEach((node) => {
      const reg = node.text?.match(/\P{Emoji}/gu)
      matches.push(reg != null && reg.length > 0 && [65039, 65038, 8205].every((code) => code !== reg[0].charCodeAt(0)))
    })
    return matches.every((m) => !m)
  }
</script>

{#if node}
  {@const attrs = node.attrs ?? {}}
  {@const nodes = node.content ?? []}

  {#if node.type === MarkupNodeType.doc}
    {#if nodes.length > 0}
      {#each nodes as node}
        <Node {node} {preview} />
      {/each}
    {/if}
  {:else if node.type === MarkupNodeType.text}
    {node.text}
  {:else if node.type === MarkupNodeType.paragraph}
    <p class="p-inline contrast" class:overflow-label={preview} class:emojiOnly={checkEmoji(nodes)}>
      {#if nodes.length > 0}
        {#each nodes as node}
          <Node {node} {preview} />
        {/each}
      {/if}
    </p>
  {:else if node.type === MarkupNodeType.blockquote}
    <blockquote class="proseBlockQuote" style:margin={preview ? '0' : null}>
      {#if nodes.length > 0}
        {#each nodes as node}
          <Node {node} {preview} />
        {/each}
      {/if}
    </blockquote>
  {:else if node.type === MarkupNodeType.horizontal_rule}
    <hr />
  {:else if node.type === MarkupNodeType.heading}
    {@const level = toNumber(node.attrs?.level) ?? 1}
    {@const element = `h${level}`}
    <svelte:element this={element}>
      {#if nodes.length > 0}
        {#each nodes as node}
          <Node {node} {preview} />
        {/each}
      {/if}
    </svelte:element>
  {:else if node.type === MarkupNodeType.code_block}
    <CodeBlockNode {node} {preview} />
  {:else if node.type === MarkupNodeType.image}
    {@const src = toString(attrs.src)}
    {@const alt = toString(attrs.alt)}
    {@const width = toString(attrs.width)}
    {@const height = toString(attrs.height)}
    <div class="imgContainer max-h-60 max-w-60">
      <img {src} {alt} {width} {height} />
    </div>
  {:else if node.type === MarkupNodeType.reference}
    {@const objectId = toString(attrs.id)}
    {@const objectClass = toString(attrs.objectclass)}
    {@const objectLabel = toString(attrs.label)}

    {#if objectClass !== undefined && objectId !== undefined}
      <ObjectNode _id={toRef(objectId)} _class={toClassRef(objectClass)} title={objectLabel} />
    {:else if nodes.length > 0}
      {#each nodes as node}
        <Node {node} {preview} />
      {/each}
    {/if}
  {:else if node.type === MarkupNodeType.hard_break}
    <br />
  {:else if node.type === MarkupNodeType.ordered_list}
    {@const start = toNumber(attrs.start) ?? 1}
    <ol style:margin={preview ? '0' : null} {start}>
      {#if nodes.length > 0}
        {#each nodes as node}
          <Node {node} {preview} />
        {/each}
      {/if}
    </ol>
  {:else if node.type === MarkupNodeType.bullet_list}
    <ul style:margin={preview ? '0' : null}>
      {#if nodes.length > 0}
        {#each nodes as node}
          <Node {node} {preview} />
        {/each}
      {/if}
    </ul>
  {:else if node.type === MarkupNodeType.list_item}
    <li>
      {#if nodes.length > 0}
        {#each nodes as node}
          <Node {node} {preview} />
        {/each}
      {/if}
    </li>
  {:else if node.type === MarkupNodeType.taskList}
    <!-- TODO not implemented -->
  {:else if node.type === MarkupNodeType.taskItem}
    <!-- TODO not implemented -->
  {:else if node.type === MarkupNodeType.subLink}
    <sub>
      {#if nodes.length > 0}
        {#each nodes as node}
          <Node {node} {preview} />
        {/each}
      {/if}
    </sub>
  {:else if node.type === MarkupNodeType.table}
    <table class="proseTable">
      <tbody>
        {#if nodes.length > 0}
          {#each nodes as node}
            <Node {node} {preview} />
          {/each}
        {/if}
      </tbody>
    </table>
  {:else if node.type === MarkupNodeType.table_row}
    <tr>
      {#if nodes.length > 0}
        {#each nodes as node}
          <Node {node} {preview} />
        {/each}
      {/if}
    </tr>
  {:else if node.type === MarkupNodeType.table_cell}
    {@const colspan = toNumber(attrs.colspan)}
    {@const rowspan = toNumber(attrs.rowspan)}
    <td {colspan} {rowspan}>
      {#if nodes.length > 0}
        {#each nodes as node}
          <Node {node} {preview} />
        {/each}
      {/if}
    </td>
  {:else if node.type === MarkupNodeType.table_header}
    {@const colspan = toNumber(attrs.colspan)}
    {@const rowspan = toNumber(attrs.rowspan)}
    <th {colspan} {rowspan}>
      {#if nodes.length > 0}
        {#each nodes as node}
          <Node {node} {preview} />
        {/each}
      {/if}
    </th>
  {:else if node.type === MarkupNodeType.mermaid}
    <!-- TODO -->
  {:else if node.type === MarkupNodeType.comment}
    <!-- Ignore -->
  {:else}
    unknown node: "{node.type}"
    {#if nodes.length > 0}
      {#each nodes as node}
        <Node {node} {preview} />
      {/each}
    {/if}
  {/if}
{/if}

<style lang="scss">
  .imgContainer {
    display: inline;
  }
  .emojiOnly {
    font-size: 2rem;
    line-height: 115%;
  }

  .img {
    :global(img) {
      object-fit: contain;
      height: 100%;
      width: 100%;
    }
  }
</style>
