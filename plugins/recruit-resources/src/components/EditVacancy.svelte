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
  import core, { ClassifierKind, Doc, Mixin, Ref } from '@hcengineering/core'
  import { Panel } from '@hcengineering/panel'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Vacancy } from '@hcengineering/recruit'
  import { FullDescriptionBox } from '@hcengineering/text-editor'
  import tracker from '@hcengineering/tracker'
  import { Button, Component, EditBox, Grid, IconMoreH, showPopup } from '@hcengineering/ui'
  import { ContextMenu, DocAttributeBar } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../plugin'
  import VacancyApplications from './VacancyApplications.svelte'

  export let _id: Ref<Vacancy>
  export let embedded = false

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

  const ignoreMixins: Set<Ref<Mixin<Doc>>> = new Set<Ref<Mixin<Doc>>>()
  const hierarchy = client.getHierarchy()
  let mixins: Mixin<Doc>[] = []

  function getMixins (object: Doc): void {
    if (object === undefined) return
    const descendants = hierarchy.getDescendants(core.class.Doc).map((p) => hierarchy.getClass(p))

    mixins = descendants.filter(
      (m) => m.kind === ClassifierKind.MIXIN && !ignoreMixins.has(m._id) && hierarchy.hasMixin(object, m._id)
    )
  }

  $: getMixins(object)
</script>

{#if object}
  <Panel
    icon={clazz.icon}
    title={object.name}
    isHeader={true}
    isAside={true}
    {embedded}
    {object}
    on:close={() => {
      dispatch('close')
    }}
  >
    <svelte:fragment slot="subtitle">
      {#if object.description}
        {#if object.description.trim().startsWith('http://') || object.description.trim().startsWith('https://')}
          <a href={object.description} class="whitespace-nowrap" target="_blank" rel="noreferrer noopener">
            {object.description}
          </a>
        {:else}
          {object.description}
        {/if}
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="attributes" let:direction={dir}>
      {#if dir === 'column'}
        <DocAttributeBar
          {object}
          {mixins}
          ignoreKeys={['name', 'description', 'fullDescription', 'private', 'archived']}
        />
      {/if}
    </svelte:fragment>

    <svelte:fragment slot="subheader">
      <span class="fs-title flex-grow">
        <EditBox
          bind:value={object.name}
          placeholder={recruit.string.VacancyPlaceholder}
          kind={'large-style'}
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
      <VacancyApplications objectId={object._id} />
      <Component is={tracker.component.RelatedIssuesSection} props={{ object, label: recruit.string.RelatedIssues }} />
    </Grid>
  </Panel>
{/if}
