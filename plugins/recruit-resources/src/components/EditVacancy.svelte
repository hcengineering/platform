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
  import activity from '@anticrm/activity'
  import { Attachments } from '@anticrm/attachment-resources'
  import type { Ref } from '@anticrm/core'
  import type { IntlString } from '@anticrm/platform'
  import { AttributesBar, createQuery, getClient } from '@anticrm/presentation'
  import { Vacancy } from '@anticrm/recruit'
  import { StyledTextBox } from '@anticrm/text-editor'
  import { Component, EditBox, Grid, Icon, IconClose, Label, Scroller, ToggleWithLabel } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../plugin'

  export let _id: Ref<Vacancy>

  let object: Vacancy

  const dispatch = createEventDispatcher()

  const client = getClient()

  const query = createQuery()
  const clazz = client.getHierarchy().getClass(recruit.class.Vacancy)

  async function updateObject (_id: Ref<Vacancy>): Promise<void> {
    await query.query(recruit.class.Vacancy, { _id }, result => {
      object = result[0]
    })
  }

  $: updateObject(_id)

  const tabs: IntlString[] = ['General' as IntlString, 'Members' as IntlString, 'Activity' as IntlString]
  let selected = 0

  function onChange (key:string, value: any): void {
    client.updateDoc(object._class, object.space, object._id, { [key]: value })
  }
</script>

<div class="antiOverlay" on:click={() => { dispatch('close') }}/>
<div class="antiDialogs antiComponent">
  {#if object}
    <div class="ac-header short mirror divide">
      <div class="ac-header__wrap-description">
        <div class="ac-header__wrap-title">
          <div class="ac-header__icon">{#if clazz.icon}<Icon icon={clazz.icon} size={'medium'} />{/if}</div>
          <div class="ac-header__title">{object.name}</div>
        </div>
        <div class="ac-header__description">{object.description}</div>
      </div>
      <div class="tool"><ActionIcon icon={IconClose} size={'small'} action={() => { dispatch('close') }} /></div>
    </div>
    <div class="ac-subtitle">
      <div class="ac-subtitle-content">
        <AttributesBar {object} keys={['dueTo', 'location', 'company']} />
      </div>
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
    {#if selected === 0}
      <Scroller padding>
        <Grid column={1} rowGap={1.5}>
          <EditBox label={recruit.string.VacancyName} bind:value={object.name} placeholder={recruit.string.VacancyPlaceholder} maxWidth="39rem" focus on:change={() => {
            if (object.name.trim().length > 0) {
                onChange('name', object.name)
            } else {
              // Revert previos object.name
              updateObject(_id)
            }
          }}/>
          <EditBox label={recruit.string.Description} bind:value={object.description} placeholder={recruit.string.VacancyDescription} maxWidth="39rem" focus on:change={() => { onChange('description', object.description) }}/>
        </Grid>
        <div class="mt-10">
          <span class="title">Details</span>
          <div class="description-container">
            <StyledTextBox bind:content={object.fullDescription} on:value={(evt) => { onChange('fullDescription', evt.detail) }} />
          </div>
        </div>
        <div class="mt-14">
          <Attachments objectId={object._id} _class={object._class} space={object.space} />
        </div>
      </Scroller>
    {:else if selected === 1}
      <Scroller padding>
        <ToggleWithLabel label={recruit.string.ThisVacancyIsPrivate} description={recruit.string.MakePrivateDescription}/>
      </Scroller>
    {:else if selected === 2}
      <Component is={activity.component.Activity} props={{ object, transparent: true }} />
    {/if}
  {/if}
</div>

<style lang="scss">
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
</style>
