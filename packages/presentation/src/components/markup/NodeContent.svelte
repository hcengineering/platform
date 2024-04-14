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
  import { MarkupNode, MarkupNodeType } from '@hcengineering/text'

  import MarkupNodes from './Nodes.svelte'
  import ObjectNode from './ObjectNode.svelte'

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

  function toString (value: string | number | undefined): string | undefined {
    return value !== undefined ? `${value}` : undefined
  }

  function toNumber (value: string | number | undefined): number | undefined {
    return value !== undefined ? (typeof value === 'string' ? parseInt(value) : value) : undefined
  }
</script>

{#if node}
  {@const attrs = node.attrs ?? {}}
  {@const nodes = node.content ?? []}

  {#if node.type === MarkupNodeType.doc}
    <MarkupNodes {nodes} {preview} />
  {:else if node.type === MarkupNodeType.text}
    {node.text}
  {:else if node.type === MarkupNodeType.paragraph}
    <p class="p-inline contrast" class:overflow-label={preview}>
      <MarkupNodes {nodes} {preview} />
    </p>
  {:else if node.type === MarkupNodeType.blockquote}
    <blockquote class="proseBlockQuote" style:margin={preview ? '0' : null}>
      <MarkupNodes {nodes} {preview} />
    </blockquote>
  {:else if node.type === MarkupNodeType.horizontal_rule}
    <hr />
  {:else if node.type === MarkupNodeType.heading}
    {@const level = toNumber(node.attrs?.level) ?? 1}
    {@const element = `h${level}`}
    <svelte:element this={element}>
      <MarkupNodes {nodes} {preview} />
    </svelte:element>
  {:else if node.type === MarkupNodeType.code_block}
    <pre class="proseCodeBlock" style:margin={preview ? '0' : null}><code><MarkupNodes {nodes} {preview} /></code></pre>
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
    {:else}
      <MarkupNodes {nodes} {preview} />
    {/if}
  {:else if node.type === MarkupNodeType.hard_break}
    <br />
  {:else if node.type === MarkupNodeType.ordered_list}
    <ol style:margin={preview ? '0' : null}>
      <MarkupNodes {nodes} {preview} />
    </ol>
  {:else if node.type === MarkupNodeType.bullet_list}
    <ul style:margin={preview ? '0' : null}>
      <MarkupNodes {nodes} {preview} />
    </ul>
  {:else if node.type === MarkupNodeType.list_item}
    <li>
      <MarkupNodes {nodes} {preview} />
    </li>
  {:else if node.type === MarkupNodeType.taskList}
    <!-- TODO not implemented -->
  {:else if node.type === MarkupNodeType.taskItem}
    <!-- TODO not implemented -->
  {:else if node.type === MarkupNodeType.sub}
    <sub>
      <MarkupNodes {nodes} {preview} />
    </sub>
  {:else if node.type === MarkupNodeType.table}
    <table class="proseTable">
      <tbody>
        <MarkupNodes {nodes} {preview} />
      </tbody>
    </table>
  {:else if node.type === MarkupNodeType.table_row}
    <tr>
      <MarkupNodes {nodes} {preview} />
    </tr>
  {:else if node.type === MarkupNodeType.table_cell}
    {@const colspan = toNumber(attrs.colspan)}
    {@const rowspan = toNumber(attrs.rowspan)}
    <td {colspan} {rowspan}>
      <MarkupNodes {nodes} {preview} />
    </td>
  {:else if node.type === MarkupNodeType.table_header}
    {@const colspan = toNumber(attrs.colspan)}
    {@const rowspan = toNumber(attrs.rowspan)}
    <th {colspan} {rowspan}>
      <MarkupNodes {nodes} {preview} />
    </th>
  {:else}
    unknown node: "{node.type}"
    <MarkupNodes {nodes} {preview} />
  {/if}
{/if}

<style lang="scss">
  .imgContainer {
    display: inline;
  }

  .img {
    :global(img) {
      object-fit: contain;
      height: 100%;
      width: 100%;
    }
  }
</style>
