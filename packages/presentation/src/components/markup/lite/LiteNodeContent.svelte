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
  import { AttrValue, MarkupNode, MarkupNodeType, MarkupMarkType } from '@hcengineering/text'

  import LiteNodes from './LiteNodes.svelte'
  import ObjectNode from '../ObjectNode.svelte'
  import NodeMarks from '../NodeMarks.svelte'

  export let node: MarkupNode

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
</script>

{#if node}
  {@const attrs = node.attrs ?? {}}
  {@const nodes = node.content ?? []}

  {#if node.type === MarkupNodeType.doc}
    <LiteNodes {nodes} />
  {:else if node.type === MarkupNodeType.text}
    {node.text}
  {:else if node.type === MarkupNodeType.paragraph}
    <p class="p-inline contrast" class:overflow-label={true} style:margin="0">
      <LiteNodes {nodes} />
    </p>
  {:else if node.type === MarkupNodeType.blockquote}
    <LiteNodes {nodes} />
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
        <LiteNodes {nodes} />
      </NodeMarks>
    </p>
  {:else if node.type === MarkupNodeType.reference}
    {@const objectId = toString(attrs.id)}
    {@const objectClass = toString(attrs.objectclass)}
    {@const objectLabel = toString(attrs.label)}

    {#if objectClass !== undefined && objectId !== undefined}
      <ObjectNode _id={toRef(objectId)} _class={toClassRef(objectClass)} title={objectLabel} />
    {:else}
      <LiteNodes {nodes} />
    {/if}
  {:else if node.type === MarkupNodeType.taskList}
    <!-- TODO not implemented -->
  {:else if node.type === MarkupNodeType.taskItem}
    <!-- TODO not implemented -->
  {:else if node.type === MarkupNodeType.subLink}
    <sub>
      <LiteNodes {nodes} />
    </sub>
  {:else}
    <LiteNodes {nodes} />
  {/if}
{/if}
