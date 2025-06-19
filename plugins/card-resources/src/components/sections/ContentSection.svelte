<!--
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
-->

<script lang="ts">
  import { Card } from '@hcengineering/card'
  import { Heading } from '@hcengineering/text-editor'
  import { createEventDispatcher, onMount } from 'svelte'

  import Content from '../Content.svelte'
  import { CardSectionAction } from '../../types'

  export let readonly: boolean = false
  export let doc: Card
  export let contentDiv: HTMLDivElement | undefined | null = undefined

  const dispatch = createEventDispatcher()

  export function navigate (id: string): void {
    const element = window.document.getElementById(id)
    element?.scrollIntoView({ behavior: 'instant', block: 'start' })
  }

  function handleHeadings (ev: CustomEvent<Heading[]>): void {
    const headings = ev.detail
    const action: CardSectionAction = { id: 'toc', toc: headings }
    dispatch('action', action)
  }

  onMount(() => {
    dispatch('action', { id: 'toc', toc: [] })
  })
</script>

{#if contentDiv != null}
  <div class="content">
    <Content {doc} {readonly} content={contentDiv} showToc={false} on:loaded on:headings={handleHeadings} />
  </div>
{/if}

<style lang="scss">
  .content {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 0 2.5rem;
    flex: 1;
  }
</style>
