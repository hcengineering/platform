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
  import { MarkupNode } from '@hcengineering/text'

  import LiteNode from './LiteNode.svelte'
  import { ParsedTextWithEmojis } from '@hcengineering/emoji'

  export let nodes: MarkupNode[]
  export let colorInherit: boolean = false
  export let parseEmojisFunction: ((text: string) => ParsedTextWithEmojis) | undefined = undefined
</script>

{#if nodes}
  {#each nodes as node}
    <LiteNode {node} {parseEmojisFunction} {colorInherit} />
  {/each}
{/if}
