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
  import { Attachments } from '@anticrm/attachment-resources'
  import type { Ref } from '@anticrm/core'
  import core from '@anticrm/core'
  import { Panel } from '@anticrm/panel'
  import { createQuery, getClient, Members } from '@anticrm/presentation'
  import { Vacancy } from '@anticrm/recruit'
  import { StyledTextBox } from '@anticrm/text-editor'
  import { EditBox, Grid, Label } from '@anticrm/ui'
  import { ClassAttributeBar } from '@anticrm/view-resources'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../plugin'

  export let _id: Ref<Vacancy>

  let object: Required<Vacancy>

  const dispatch = createEventDispatcher()

  const client = getClient()

  const query = createQuery()
  const clazz = client.getHierarchy().getClass(recruit.class.Vacancy)

  function updateObject (_id: Ref<Vacancy>): void {
    query.query(recruit.class.Vacancy, { _id }, (result) => {
      object = result[0] as Required<Vacancy>
    })
  }

  $: updateObject(_id)

  function onChange (key: string, value: any): void {
    client.updateDoc(object._class, object.space, object._id, { [key]: value })
  }
</script>

{#if object}
  <Panel
    title={object.name}
    subtitle={object.description}
    icon={clazz.icon}
    isHeader={false}
    isAside={true}
    {object}
    isFullSize
    on:fullsize
    on:close={() => {
      dispatch('close')
    }}
  >
    <svelte:fragment slot="attributes" let:direction={dir}>
      {#if dir === 'column'}
        <div class="ac-subtitle">
          <div class="ac-subtitle-content">
            <ClassAttributeBar
              {object}
              _class={object._class}
              ignoreKeys={['name', 'description', 'fullDescription']}
              vertical
              to={core.class.Space}
            />
          </div>
        </div>
      {/if}
    </svelte:fragment>

    <Grid column={1} rowGap={1.5}>
      <EditBox
        label={recruit.string.VacancyName}
        bind:value={object.name}
        placeholder={recruit.string.VacancyPlaceholder}
        maxWidth="39rem"
        focus
        on:change={() => {
          if (object.name.trim().length > 0) {
            onChange('name', object.name)
          } else {
            // Revert previos object.name
            updateObject(_id)
          }
        }}
      />
      <EditBox
        label={recruit.string.Description}
        bind:value={object.description}
        placeholder={recruit.string.VacancyDescription}
        maxWidth="39rem"
        focus
        on:change={() => {
          onChange('description', object.description)
        }}
      />
    </Grid>
    <div class="mt-10">
      <span class="title">Details</span>
      <div class="description-container">
        <StyledTextBox
          bind:content={object.fullDescription}
          on:value={(evt) => {
            onChange('fullDescription', evt.detail)
          }}
        />
      </div>
    </div>
    <div class="mt-10">
      <Attachments
        objectId={object._id}
        _class={object._class}
        space={object.space}
        attachments={object.attachments ?? 0}
      />
    </div>
    <div class="flex-col mt-10 flex-no-shrink">
      <span class="fs-title text-xl overflow-label mb-2 flex-no-shrink">
        <Label label={recruit.string.Members} />
      </span>
      <Members space={object} />
    </div>
  </Panel>
{/if}

<style lang="scss">
  .description-container {
    display: flex;
    margin-top: 0.5rem;
    padding: 1rem;
    height: 12rem;
    background-color: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: 0.25rem;
  }
</style>
