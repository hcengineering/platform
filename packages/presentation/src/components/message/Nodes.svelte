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
      {#if node.nodeName === 'EM'}
        <em><svelte:self nodes={node.childNodes}/></em>
      {:else if node.nodeName === 'STRONG'}
        <strong><svelte:self nodes={node.childNodes}/></strong>
      {:else if node.nodeName === 'P'}
        <p><svelte:self nodes={node.childNodes}/></p>
      {:else if node.nodeName === 'BLOCKQUOTE'}
        <blockquote><svelte:self nodes={node.childNodes}/></blockquote>
      {:else if node.nodeName === 'CODE'}
        <code><svelte:self nodes={node.childNodes}/></code>
      {:else if node.nodeName === 'BR'}
        <br/>
      {:else if node.nodeName === 'H1'}
        <h1><svelte:self nodes={node.childNodes}/></h1>
      {:else if node.nodeName === 'H2'}
        <h2><svelte:self nodes={node.childNodes}/></h2>
      {:else if node.nodeName === 'UL'}
        <ul><svelte:self nodes={node.childNodes}/></ul>
      {:else if node.nodeName === 'LI'}
        <li><svelte:self nodes={node.childNodes}/></li>
      {:else if node.nodeName === 'SPAN'}
        <Person objectId={node.getAttribute('data-id')} title={node.getAttribute('data-label')} />
      {:else}
        Unknown { node.nodeName }
      {/if}
    {/if}
  {/each}
{/if}

