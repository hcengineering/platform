<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Data, DateRangeMode, generateId, Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { Card, getClient, SpaceSelector } from '@hcengineering/presentation'
  import { UserBoxList } from '@hcengineering/contact-resources'
  import { Scrum, Project } from '@hcengineering/tracker'
  import { DateRangePresenter, EditBox } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import { StyledTextArea } from '@hcengineering/text-editor'

  export let space: Ref<Project>

  const objectId: Ref<Scrum> = generateId()
  const dispatch = createEventDispatcher()
  const client = getClient()

  const object: Partial<Data<Scrum>> = {
    title: '' as IntlString,
    description: '',
    members: [],
    attachments: 0,
    scrumRecords: 0
  }

  let canSave = false
  async function onSave () {
    if (object.beginTime && object.endTime) {
      await client.createDoc(tracker.class.Scrum, space, object as Data<Scrum>, objectId)
    }
  }

  $: {
    if (
      object.endTime &&
      object.beginTime &&
      object.endTime - object.beginTime > 0 &&
      object.title !== '' &&
      object.members?.length !== 0
    ) {
      canSave = true
    } else {
      canSave = false
    }
  }
</script>

<Card
  label={tracker.string.NewScrum}
  okLabel={tracker.string.CreateScrum}
  {canSave}
  okAction={onSave}
  gap={'gapV-4'}
  on:close={() => dispatch('close')}
  on:changeContent
>
  <svelte:fragment slot="header">
    <SpaceSelector _class={tracker.class.Project} label={tracker.string.Project} bind:space />
  </svelte:fragment>
  <EditBox
    bind:value={object.title}
    placeholder={tracker.string.ScrumTitlePlaceholder}
    kind={'large-style'}
    autoFocus
  />
  <StyledTextArea
    bind:content={object.description}
    placeholder={tracker.string.ScrumDescriptionPlaceholder}
    kind={'emphasized'}
  />
  <svelte:fragment slot="pool">
    <UserBoxList bind:items={object.members} label={tracker.string.ScrumMembersSearchPlaceholder} />
    <DateRangePresenter
      value={object.beginTime}
      labelNull={tracker.string.ScrumBeginTime}
      mode={DateRangeMode.TIME}
      on:change={(res) => {
        if (res.detail !== undefined && res.detail !== null) {
          object.beginTime = res.detail
        }
      }}
      editable
    />
    <DateRangePresenter
      value={object.endTime}
      labelNull={tracker.string.ScrumEndTime}
      mode={DateRangeMode.TIME}
      on:change={(res) => {
        if (res.detail !== undefined && res.detail !== null) {
          object.endTime = res.detail
        }
      }}
      editable
    />
  </svelte:fragment>
</Card>
