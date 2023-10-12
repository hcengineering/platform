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
  import { CheckBox, Component, navigate, parseLocation } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  import { getMetadata } from '@hcengineering/platform'

  import presentation from '../../plugin'

  export let nodes: NodeListOf<any>

  function prevName (pos: number, nodes: NodeListOf<any>): string | undefined {
    while (true) {
      if (nodes[pos - 1]?.nodeName === '#text' && (nodes[pos - 1]?.data ?? '').trim() === '') {
        pos--
        continue
      }
      break
    }
    return nodes[pos - 1]?.nodeName
  }

  function handleLink (node: HTMLElement, e: MouseEvent) {
    try {
      const href = node.getAttribute('href')
      if (href) {
        const url = new URL(href)
        const frontUrl = getMetadata(presentation.metadata.FrontUrl) ?? window.location.origin

        if (url.origin === frontUrl) {
          e.preventDefault()
          navigate(parseLocation(url))
        }
      }
    } catch {}
  }
  function correctClass (clName: string): string {
    if (clName === 'contact:class:Employee') {
      return 'contact:mixin:Employee'
    }
    return clName
  }
</script>

{#if nodes}
  {#each nodes as node, ni}
    {#if node.nodeType === Node.TEXT_NODE}
      {node.data}
    {:else if node.nodeName === 'EM'}
      <em><svelte:self nodes={node.childNodes} /></em>
    {:else if node.nodeName === 'STRONG' || node.nodeName === 'B'}
      <strong><svelte:self nodes={node.childNodes} /></strong>
    {:else if node.nodeName === 'U'}
      <u><svelte:self nodes={node.childNodes} /></u>
    {:else if node.nodeName === 'P'}
      {#if node.childNodes.length > 0}
        <p class="p-inline contrast">
          <svelte:self nodes={node.childNodes} />
        </p>
      {/if}
    {:else if node.nodeName === 'BLOCKQUOTE'}
      <blockquote><svelte:self nodes={node.childNodes} /></blockquote>
    {:else if node.nodeName === 'CODE'}
      <pre class="proseCode"><svelte:self nodes={node.childNodes} /></pre>
    {:else if node.nodeName === 'PRE'}
      <pre class="proseCodeBlock"><svelte:self nodes={node.childNodes} /></pre>
    {:else if node.nodeName === 'BR'}
      {@const pName = prevName(ni, nodes)}
      {#if pName !== 'P' && pName !== 'BR' && pName !== undefined}
        <br />
      {/if}
    {:else if node.nodeName === 'HR'}
      <hr />
    {:else if node.nodeName === 'IMG'}
      <div class="max-h-60 max-w-60">{@html node.outerHTML}</div>
    {:else if node.nodeName === 'H1'}
      <h1><svelte:self nodes={node.childNodes} /></h1>
    {:else if node.nodeName === 'H2'}
      <h2><svelte:self nodes={node.childNodes} /></h2>
    {:else if node.nodeName === 'H3'}
      <h3><svelte:self nodes={node.childNodes} /></h3>
    {:else if node.nodeName === 'H4'}
      <h4><svelte:self nodes={node.childNodes} /></h4>
    {:else if node.nodeName === 'H5'}
      <h5><svelte:self nodes={node.childNodes} /></h5>
    {:else if node.nodeName === 'H6'}
      <h6><svelte:self nodes={node.childNodes} /></h6>
    {:else if node.nodeName === 'UL' || node.nodeName === 'LIST'}
      <ul><svelte:self nodes={node.childNodes} /></ul>
    {:else if node.nodeName === 'OL' || node.nodeName === 'LIST=1'}
      <ol><svelte:self nodes={node.childNodes} /></ol>
    {:else if node.nodeName === 'LI'}
      <li class={node.className}><svelte:self nodes={node.childNodes} /></li>
    {:else if node.nodeName === 'DIV'}
      <div><svelte:self nodes={node.childNodes} /></div>
    {:else if node.nodeName === 'A'}
      <a href={node.getAttribute('href')} target={node.getAttribute('target')} on:click={(e) => handleLink(node, e)}>
        <svelte:self nodes={node.childNodes} />
      </a>
    {:else if node.nodeName === 'LABEL'}
      <svelte:self nodes={node.childNodes} />
    {:else if node.nodeName === 'INPUT'}
      {#if node.type?.toLowerCase() === 'checkbox'}
        <div class="checkboxContainer">
          <CheckBox readonly checked={node.checked} />
        </div>
      {/if}
    {:else if node.nodeName === 'SPAN'}
      {#if node.getAttribute('data-objectclass') !== undefined && node.getAttribute('data-id') !== undefined}
        <Component
          is={view.component.ObjectPresenter}
          inline
          props={{
            objectId: node.getAttribute('data-id'),
            title: node.getAttribute('data-label'),
            _class: correctClass(node.getAttribute('data-objectclass')),
            inline: true
          }}
        />
      {:else}
        <svelte:self nodes={node.childNodes} />
      {/if}
    {:else if node.nodeName === 'TABLE'}
      <table class={node.className}><svelte:self nodes={node.childNodes} /></table>
    {:else if node.nodeName === 'TBODY'}
      <tbody><svelte:self nodes={node.childNodes} /></tbody>
    {:else if node.nodeName === 'TR'}
      <tr><svelte:self nodes={node.childNodes} /></tr>
    {:else if node.nodeName === 'TH'}
      <th><svelte:self nodes={node.childNodes} /></th>
    {:else if node.nodeName === 'TD'}
      <td><svelte:self nodes={node.childNodes} /></td>
    {:else if node.nodeName === 'S'}
      <s><svelte:self nodes={node.childNodes} /></s>
    {:else}
      unknown: "{node.nodeName}"
      <svelte:self nodes={node.childNodes} />
    {/if}
  {/each}
{/if}

<style lang="scss">
  .img {
    :global(img) {
      object-fit: contain;
      height: 100%;
      width: 100%;
    }
  }

  .checkboxContainer {
    padding-top: 0.125rem;
  }

  em,
  strong,
  blockquote,
  pre,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  ol,
  li,
  .checkboxContainer,
  s {
    color: var(--theme-accent-color);
  }
</style>
