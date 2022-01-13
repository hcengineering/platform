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
  import type { IntlString } from '@anticrm/platform'
  import type { Ref } from '@anticrm/core'
  import { IconClose, Label, EditBox, ToggleWithLabel, Grid, Icon, Component } from '@anticrm/ui'
  import { TextEditor } from '@anticrm/text-editor'
  import { AttributesBar, getClient, createQuery } from '@anticrm/presentation'
  import { Vacancy } from '@anticrm/recruit'
  import { createEventDispatcher } from 'svelte'
  import activity from '@anticrm/activity'
  import { Attachments } from '@anticrm/attachment-resources'
  import recruit from '../plugin'

  export let _id: Ref<Vacancy>

  let object: Vacancy

  const dispatch = createEventDispatcher()

  const client = getClient()

  const query = createQuery()
  const clazz = client.getHierarchy().getClass(recruit.class.Vacancy)
  $: query.query(recruit.class.Vacancy, { _id }, result => { object = result[0] })

  const tabs: IntlString[] = ['General' as IntlString, 'Members' as IntlString, 'Activity' as IntlString]
  let selected = 0
  let textEditor: TextEditor

  function onChange (key:string, value: any): void {
    client.updateDoc(object._class, object.space, object._id, { [key]: value })
  }

</script>

<div class="overlay" on:click={() => { dispatch('close') }}/>
<div class="dialog-container">
  {#if object}
    <div class="flex-row-center header">
      <div class="flex-grow">
        <div class="flex">
          <div class="svg-medium flex-no-shrink">
            {#if clazz.icon}<Icon icon={clazz.icon} size={'medium'} />{/if}
          </div>
          <div class="flex-grow fs-title ml-2">
            {object.name}
          </div>
        </div>
        <div class="small-text">{object.description}</div>
      </div>
      <div class="tool" on:click={() => { dispatch('close') }}><IconClose size={'small'} /></div>
    </div>
    <div class="flex-row-center subtitle">
      <AttributesBar {object} keys={['dueTo', 'location', 'company']} />
    </div>
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
          <Grid column={1} rowGap={1.5}>
            <EditBox label={recruit.string.VacancyName} bind:value={object.name} placeholder="Software Engineer" maxWidth="39rem" focus on:change={() => {onChange('name', object.name)}}/>
            <EditBox label={recruit.string.Description} bind:value={object.description} placeholder='Description' maxWidth="39rem" focus on:change={() => {onChange('description', object.description)}}/>
          </Grid>
          <div class="mt-10">
            <span class="title">Description</span>
            <div class="description-container">
              <TextEditor bind:this={textEditor} bind:content={object.fullDescription} on:blur={textEditor.submit} on:content={() => {onChange('fullDescription', object.fullDescription)}} />
            </div>
          </div>
          <div class="mt-14">
            <Attachments objectId={object._id} _class={object._class} space={object.space} />
          </div>
        {:else if selected === 1}
          <ToggleWithLabel label={recruit.string.ThisVacancyIsPrivate} description={recruit.string.MakePrivateDescription}/>
        {:else if selected === 2}
          <Component is={activity.component.Activity} props={{object, transparent: true}} />
        {/if}
      </div>
    </div>
  {/if}
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
    background: var(--theme-bg-color);
    border-radius: 1.25rem;

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

    .subtitle {
      flex-shrink: 0;
      padding: 0 2.5rem;
      height: 3.5rem;
      border-bottom: 1px solid var(--theme-dialog-divider);
    }
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
    margin: 1rem 2rem;
    padding: 1.5rem .5rem;
    height: 100%;

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
    background-color: #000;
    opacity: .5;
  }

  .title {
    margin-right: .75rem;
    font-weight: 500;
    font-size: 1.25rem;
    color: var(--theme-caption-color);
  }

  .description-container {
    display: flex;
    justify-content: space-between;
    overflow-y: auto;
    height: 100px;
    padding: 0px 16px;
    background-color: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-bg-accent-color);
    border-top: 20px solid transparent;
    border-bottom: 20px solid transparent;
    border-radius: .75rem;
    margin-top: 1.5rem;
  }
</style>