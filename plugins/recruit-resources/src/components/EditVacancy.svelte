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
  import { Attachments } from '@hcengineering/attachment-resources'
  import type { Ref } from '@hcengineering/core'
  import core from '@hcengineering/core'
  import { Panel } from '@hcengineering/panel'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Vacancy } from '@hcengineering/recruit'
  import { FullDescriptionBox } from '@hcengineering/text-editor'
  import tracker from '@hcengineering/tracker'
  import { Button, Component, EditBox, Grid, Icon, IconAdd, IconMoreH, Label, showPopup } from '@hcengineering/ui'
  import { ClassAttributeBar, ContextMenu } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../plugin'

  export let _id: Ref<Vacancy>

  let object: Required<Vacancy>
  let rawName: string = ''
  let rawDesc: string = ''

  const dispatch = createEventDispatcher()

  const client = getClient()

  const query = createQuery()
  const clazz = client.getHierarchy().getClass(recruit.class.Vacancy)

  function updateObject (_id: Ref<Vacancy>): void {
    query.query(recruit.class.Vacancy, { _id }, (result) => {
      object = result[0] as Required<Vacancy>
      rawName = object.name
      rawDesc = object.description
    })
  }

  $: updateObject(_id)

  function onChange (key: string, value: any): void {
    client.updateDoc(object._class, object.space, object._id, { [key]: value })
  }

  function showMenu (ev?: Event): void {
    if (object !== undefined) {
      showPopup(ContextMenu, { object }, (ev as MouseEvent).target as HTMLElement)
    }
  }
</script>

{#if object}
  <Panel
    icon={clazz.icon}
    title={object.name}
    subtitle={object.description}
    isHeader={true}
    isAside={true}
    {object}
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
              ignoreKeys={['name', 'description', 'fullDescription', 'private', 'archived']}
              to={core.class.Doc}
            />
          </div>
        </div>
      {/if}
    </svelte:fragment>

    <svelte:fragment slot="subheader">
      <span class="fs-title flex-grow">
        <EditBox
          bind:value={object.name}
          placeholder={recruit.string.VacancyPlaceholder}
          kind={'large-style'}
          focus
          focusable
          on:blur={() => {
            if (rawName !== object.name) onChange('name', object.name)
          }}
        />
      </span>
    </svelte:fragment>
    <svelte:fragment slot="utils">
      <div class="p-1">
        <Button icon={IconMoreH} kind={'transparent'} size={'medium'} on:click={showMenu} />
      </div>
    </svelte:fragment>

    <Grid column={1} rowGap={1.5}>
      <EditBox
        bind:value={object.description}
        placeholder={recruit.string.VacancyDescription}
        focusable
        on:blur={() => {
          if (rawDesc !== object.description) onChange('description', object.description)
        }}
      />
      <FullDescriptionBox
        content={object.fullDescription}
        on:save={(res) => {
          onChange('fullDescription', res.detail)
        }}
      />
      <Attachments
        objectId={object._id}
        _class={object._class}
        space={object.space}
        attachments={object.attachments ?? 0}
      />
      <!-- <MembersBox label={recruit.string.Members} space={object} /> -->

      <div class="antiSection">
        <div class="antiSection-header">
          <div class="antiSection-header__icon">
            <Icon icon={tracker.icon.Issue} size={'small'} />
          </div>
          <span class="antiSection-header__title">
            <Label label={recruit.string.RelatedIssues} />
          </span>
          <div class="buttons-group small-gap">
            <Button
              id="add-sub-issue"
              width="min-content"
              icon={IconAdd}
              label={undefined}
              labelParams={{ subIssues: 0 }}
              kind={'transparent'}
              size={'small'}
              on:click={() => {
                showPopup(tracker.component.CreateIssue, { relatedTo: object, space: object.space }, 'top')
              }}
            />
          </div>
        </div>
        <div class="flex-row">
          <Component is={tracker.component.RelatedIssues} props={{ object }} />
        </div>
      </div></Grid
    >
  </Panel>
{/if}
