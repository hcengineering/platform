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
  import chunter from '@anticrm/chunter'
  import type { Doc, TxCUD } from '@anticrm/core'
  import core, { SortingOrder } from '@anticrm/core'
  import type { Asset } from '@anticrm/platform'
  import { Backlink, createQuery, getClient } from '@anticrm/presentation'
  import { ReferenceInput } from '@anticrm/text-editor'
  import type { AnySvelteComponent } from '@anticrm/ui'
  import {
    Grid, Icon, IconActivity, IconClose,
    IconExpand, ScrollBox
  } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'

  export let title: string
  export let icon: Asset | AnySvelteComponent
  export let fullSize: boolean = false
  export let object: Doc

  const dispatch = createEventDispatcher()

  let txes: TxCUD<Doc>[]

  const client = getClient()

  const txQuery = createQuery()
  $: txQuery.query(
    core.class.TxCUD,
    { objectId: object._id },
    (result) => {
      txes = result
    },
    { sort: { modifiedOn: SortingOrder.Ascending } }
  )

  function onMessage (event: CustomEvent) {
    client.createDoc(chunter.class.Comment, object.space, {
      attachedTo: object._id,
      attachedToClass: object._class,
      message: event.detail
    })
    console.log(event.detail)
  }
</script>

<div
  class="overlay"
  on:click={() => {
    dispatch('close')
  }}
/>
<div class="dialog-container" class:fullSize>
  {#if fullSize}
    <div class="leftSection">
      <div class="flex-row-center header">
        <div class="icon">
          {#if typeof icon === 'string'}
            <Icon {icon} size={'small'} />
          {:else}
            <svelte:component this={icon} size={'small'} />
          {/if}
        </div>
        <div class="title">{title}</div>
      </div>
      {#if $$slots.subtitle}<div class="flex-row-center subtitle">
          <slot name="subtitle" />
        </div>{/if}
      <div class="flex-col scroll-container">
        <div class="flex-col content">
          <slot />
        </div>
      </div>
    </div>
    <div class="rightSection">
      <div class="flex-row-center header">
        <div class="icon"><IconActivity size={'small'} /></div>
        <div class="title">Activity</div>
      </div>
      <div class="flex-col h-full content">
        <ScrollBox vertical stretch>
          {#if txes}
            <Grid column={1} rowGap={1.5}>
              {#each txes as tx}
                <pre>
                  {JSON.stringify(tx, undefined, 2)}
                </pre>
              {/each}
            </Grid>
          {/if}
        </ScrollBox>
      </div>
      <div class="ref-input"><ReferenceInput on:message={onMessage} /></div>
    </div>
  {:else}
    <div class="unionSection">
      <div class="flex-row-center header">
        <div class="icon">
          {#if typeof icon === 'string'}
            <Icon {icon} size={'small'} />
          {:else}
            <svelte:component this={icon} size={'small'} />
          {/if}
        </div>
        <div class="title">{title}</div>
      </div>
      {#if $$slots.subtitle}<div class="flex-row-center subtitle">
          <slot name="subtitle" />
        </div>{/if}
      <ScrollBox vertical stretch noShift>
        <div class="flex-col content">
          <slot />
        </div>
        <div class="flex-row-center activity header">
          <div class="icon"><IconActivity size={'small'} /></div>
          <div class="title">Activity</div>
        </div>
        <div class="flex-col activity content">
          {#if txes}
            <Grid column={1} rowGap={1.5}>
              {#each txes as tx}
                <pre>
                  {JSON.stringify(tx, undefined, 2)}
                </pre>
              {/each}
            </Grid>
          {/if}
        </div>
      </ScrollBox>
      <div class="ref-input"><ReferenceInput on:message={onMessage} /></div>
    </div>
  {/if}

  <div class="tools">
    <div
      class="tool"
      on:click={() => {
        fullSize = !fullSize
      }}
    >
      <div class="icon"><IconExpand size={'small'} /></div>
    </div>
    <div
      class="tool"
      on:click={() => {
        dispatch('close')
      }}
    >
      <div class="icon"><IconClose size={'small'} /></div>
    </div>
  </div>
</div>

<style lang="scss">
  .dialog-container {
    overflow: hidden;
    position: fixed;
    top: 32px;
    bottom: 1.25rem;
    left: 50%;
    right: 1rem;

    display: flex;
    flex-direction: column;
    height: calc(100% - 32px - 1.25rem);
    background: rgba(31, 31, 37, 0.7);
    border-radius: 1.25rem;
    box-shadow: 0px 44px 154px rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(30px);

    .header {
      flex-shrink: 0;
      padding: 0 2.5rem;
      height: 4.5rem;
      border-bottom: 1px solid var(--theme-card-divider);

      .icon {
        opacity: 0.6;
      }
      .title {
        flex-grow: 1;
        margin-left: 0.5rem;
        font-weight: 500;
        font-size: 1rem;
        color: var(--theme-caption-color);
        user-select: none;
      }
    }

    .subtitle {
      flex-shrink: 0;
      padding: 0 2rem;
      height: 3.5rem;
      border-bottom: 1px solid var(--theme-bg-accent-hover);
    }
  }

  .unionSection {
    flex-grow: 1;

    display: flex;
    flex-direction: column;
    height: max-content;

    .content {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      padding: 1.5rem 2.5rem;
      height: max-content;
    }
    .activity {
      background-color: var(--theme-bg-accent-color);
      &.header {
        border-bottom: none;
      }
      &.content {
        flex-grow: 1;
        padding-bottom: 0;
        background-color: var(--theme-bg-accent-color);
      }
    }
  }

  .fullSize {
    flex-direction: row;
    left: 1rem;
  }

  .leftSection,
  .rightSection {
    flex-basis: 50%;
    display: flex;
    flex-direction: column;
  }
  .leftSection {
    border-right: 1px solid var(--theme-bg-accent-hover);
    .scroll-container {
      overflow: auto;
      margin: 2rem 2rem 1.5rem;
      .content {
        flex-shrink: 0;
        margin: 0.5rem 0.5rem 0;
      }
    }
  }
  .rightSection {
    background-color: transparent;
    .header {
      border-bottom: 1px solid var(--theme-card-divider);
    }
    .content {
      flex-grow: 1;
      padding: 2.5rem 2.5rem 0;
      background-color: var(--theme-bg-accent-color);
    }
  }

  .ref-input {
    background-color: var(--theme-bg-accent-color);
    padding: 1.5rem 2.5rem;
  }

  .tools {
    position: absolute;
    display: flex;
    top: 1.75rem;
    right: 2rem;

    .tool {
      margin-left: 0.75rem;
      opacity: 0.4;
      cursor: pointer;

      .icon {
        transform-origin: center center;
        transform: scale(0.75);
      }
      &:hover {
        opacity: 1;
      }
    }
  }

  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--theme-menu-color);
    opacity: 0.7;
  }
</style>
