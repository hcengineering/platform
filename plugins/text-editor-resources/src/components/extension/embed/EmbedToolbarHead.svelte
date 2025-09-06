<!--
//
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
//
-->
<script lang="ts">
  import { ObjectNode } from '@hcengineering/presentation'
  import { NodeViewProps } from '../../node-view'
  import { parseReferenceUrl } from '../reference'
  import { EmbedCursor, shouldShowLink } from './embed'

  export let editor: NodeViewProps['editor']
  export let cursor: EmbedCursor | null = null

  $: showSrc = shouldShowLink(cursor)
  $: reference = cursor?.props.src !== undefined ? parseReferenceUrl(cursor.props.src) : undefined
</script>

{#if cursor && showSrc}
  {#if !reference}
    <a class="link" href={cursor.props.src} target="_blank">{cursor.props.src}</a>
  {:else}
    <ObjectNode _id={reference.id} _class={reference.objectclass} title={reference.label} transparent />
    <div class="buttons-divider" />
  {/if}
{/if}

<style lang="scss">
  .link {
    padding: 0 0.5rem;
    padding-right: 0;
    max-width: 20rem;
    font-weight: 400;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--theme-link-color);

    &:hover {
      color: var(--theme-link-color);
    }
  }
</style>
