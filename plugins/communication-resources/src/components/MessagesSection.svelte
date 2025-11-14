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
  import { NotificationContext } from '@hcengineering/communication-types'
  import { createEventDispatcher, onMount } from 'svelte'

  import MessagesList from './MessagesList.svelte'

  export let readonly: boolean = false
  export let doc: Card
  export let context: NotificationContext | undefined = undefined
  export let isContextLoaded: boolean = false
  export let scrollDiv: HTMLDivElement | undefined | null = undefined
  export let contentDiv: HTMLDivElement | undefined | null = undefined
  export let active: boolean = false
  export let isDefault: boolean = false

  const dispatch = createEventDispatcher()

  let list: MessagesList | undefined = undefined

  let position: 'start' | 'end' = isDefault ? 'end' : 'start'
  let prevActive: boolean = false

  $: if (active !== prevActive) {
    if (!active) {
      position = 'start'
    }
    prevActive = active
  }

  export function navigate () {
    position = 'end'
    list?.scrollDown()
  }

  export function scrollDown (): void {
    position = 'end'
    list?.scrollDown()
  }

  export function canScrollDown (): boolean {
    return list?.canScrollDown() ?? false
  }

  export function editLastMessage (): void {
    list?.editLastMessage()
  }

  onMount(() => {
    if (isDefault) {
      dispatch('action', { id: 'overlay', show: true })
      position = 'end'
    }
  })
</script>

{#if scrollDiv != null && isContextLoaded && contentDiv != null}
  <div class="section-messages">
    <MessagesList
      bind:this={list}
      card={doc}
      {readonly}
      {scrollDiv}
      {contentDiv}
      {position}
      {context}
      on:top-loaded
      on:top-hidden
      on:change
      on:action
      on:loaded={() => {
        dispatch('action', { id: 'overlay', show: false })
        dispatch('loaded')
      }}
    />
  </div>
{/if}

<style lang="scss">
  .section-messages {
    display: flex;
    flex-direction: column;
    flex: 1;
    width: 100%;
  }
</style>
