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
  import type { Class, Ref, Space } from '@anticrm/core'
  import core from '@anticrm/core'
  import type { IntlString } from '@anticrm/platform'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { EditBox, Grid, Icon, IconClose, Label } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'

  export let _id: Ref<Space>
  export let spaceClass: Ref<Class<Space>>

  let space: Space

  // export let label: IntlString
  // export let icon: Asset | AnySvelteComponent

  const dispatch = createEventDispatcher()

  const client = getClient()
  const clazz = client.getHierarchy().getClass(spaceClass)

  const query = createQuery()
  $: query.query(core.class.Space, { _id }, result => { space = result[0] })

  const tabs: IntlString[] = ['General' as IntlString, 'Members' as IntlString]
  let selected = 0

  function onNameChange (ev: Event) {
    const value = (ev.target as HTMLInputElement).value
    if (value.trim().length > 0) {
      client.updateDoc(spaceClass, space.space, space._id, { name: value })
    } else {
      // Just refresh value
      query.query(core.class.Space, { _id }, result => { space = result[0] })
    }
  }

</script>

<div class="overlay" on:click={() => { dispatch('close') }}/>
<div class="dialog-container">
  <div class="flex-row-center header">
    <Icon icon={clazz.icon} size={'medium'} />
    <div class="flex-grow fs-title ml-2"><Label label={clazz.label} /></div>
    <div class="tool" on:click={() => { dispatch('close') }}><IconClose size={'small'} /></div>
  </div>
  <!-- <div class="flex-row-center subtitle">
    Subtitle
  </div> -->
  <div class="flex-stretch tab-container">
    {#each tabs as tab, i}
      <div class="flex-row-center tab" class:selected={i === selected}
           on:click={() => { selected = i }}>
        <Label label={tab}/>
      </div>
    {/each}
    <div class="grow"/>
  </div>
  <div class="scroll">
    <div class="flex-col box">
      {#if selected === 0}
        {#if space}
          <Grid column={1} rowGap={1.5}>
            <EditBox label={clazz.label} icon={clazz.icon} bind:value={space.name} placeholder={clazz.label} maxWidth="39rem" focus on:change={onNameChange}/>
            <!-- <AttributeBarEditor maxWidth="39rem" object={space} key="name"/> -->
            <!-- <ToggleWithLabel label={workbench.string.MakePrivate} description={workbench.string.MakePrivateDescription}/> -->
          </Grid>
        {/if}
      {:else}
        Members and other
      {/if}
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
    background: var(--theme-dialog-bg-spec);
    border-radius: 1.25rem;
    box-shadow: var(--theme-dialog-shadow);
    backdrop-filter: blur(15px);

    .header {
      flex-shrink: 0;
      padding: 0 2rem 0 2.5rem;
      height: 4.5rem;
      border-bottom: 1px solid var(--theme-dialog-divider);

      .tool {
        margin-left: .75rem;
        color: var(--theme-content-accent-color);
        cursor: pointer;
        &:hover { color: var(--theme-caption-color); }
      }
    }

    // .subtitle {
    //   flex-shrink: 0;
    //   padding: 0 2.5rem;
    //   height: 3.5rem;
    //   border-bottom: 1px solid var(--theme-dialog-divider);
    // }
  }

  .tab-container {
    flex-shrink: 0;
    flex-wrap: nowrap;
    margin: 0 2.5rem;
    height: 4.5rem;
    border-bottom: 1px solid var(--theme-menu-divider);

    .tab {
      height: 4.5rem;
      font-weight: 500;
      color: var(--theme-content-trans-color);
      cursor: pointer;
      user-select: none;

      &.selected {
        border-top: .125rem solid transparent;
        border-bottom: .125rem solid var(--theme-caption-color);
        color: var(--theme-caption-color);
        cursor: default;
      }
    }
    .tab + .tab {
      margin-left: 2.5rem;
    }
    .grow {
      min-width: 2.5rem;
      flex-grow: 1;
    }
  }

  .scroll {
    flex-grow: 1;
    overflow-x: hidden;
    overflow-y: auto;
    margin: 1rem 0;
    padding: 1.5rem 2.5rem;

    .box {
      margin-right: 1px;
      height: 100%;
    }
  }

  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--theme-menu-color);
    opacity: .6;
  }
</style>