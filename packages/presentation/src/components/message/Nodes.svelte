<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import Person from './Person.svelte'

  export let nodes: NodeListOf<any>
</script>

{#if nodes}
  {#each nodes as node}
    {#if node.nodeType === Node.TEXT_NODE}
      {node.data}
    {:else}
      {#if node.nodeName === 'em'}
        <em><svelte:self nodes={node.childNodes}/></em>
      {:else if node.nodeName === 'strong'}
        <strong><svelte:self nodes={node.childNodes}/></strong>
      {:else if node.nodeName === 'span'}
        <Person objectId={node.getAttribute('data-id')} title={node.getAttribute('data-label')} />
      {:else}
        Unknown { node.nodeName }
      {/if}
    {/if}
  {/each}
{/if}

