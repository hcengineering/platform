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
  import { createQuery, getClient, MembersBox } from '@anticrm/presentation'
  import type { Funnel } from '@anticrm/lead'
  import { FullDescriptionBox } from '@anticrm/text-editor'
  import { EditBox, Grid } from '@anticrm/ui'
  import { ClassAttributeBar } from '@anticrm/view-resources'
  import { createEventDispatcher } from 'svelte'
  import lead from '../plugin'

  export let _id: Ref<Funnel>

  let object: Required<Funnel>

  const dispatch = createEventDispatcher()

  const client = getClient()

  const query = createQuery()
  const clazz = client.getHierarchy().getClass(lead.class.Funnel)

  function updateObject (_id: Ref<Funnel>): void {
    query.query(lead.class.Funnel, { _id }, (result) => {
      object = result[0] as Required<Funnel>
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
              to={core.class.Space}
            />
          </div>
        </div>
      {/if}
    </svelte:fragment>

    <Grid column={1} rowGap={1.5}>
      <EditBox
        bind:value={object.name}
        placeholder={lead.string.FunnelPlaceholder}
        maxWidth={'39rem'}
        kind={'large-style'}
        focus
        focusable
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
        bind:value={object.description}
        placeholder={lead.string.Description}
        maxWidth={'39rem'}
        focusable
        on:change={() => {
          onChange('description', object.description)
        }}
      />
      <FullDescriptionBox
        content={object.fullDescription}
        alwaysEdit
        on:change={(result) => {
          if (result.detail !== undefined) onChange('fullDescription', result.detail)
        }}
      />
      <Attachments
        objectId={object._id}
        _class={object._class}
        space={object.space}
        attachments={object.attachments ?? 0}
      />
      <MembersBox label={lead.string.Members} space={object} />
    </Grid>
  </Panel>
{/if}
