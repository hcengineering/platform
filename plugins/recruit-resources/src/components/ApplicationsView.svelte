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
  import attachment from '@anticrm/attachment'
  import chunter from '@anticrm/chunter'
  import contact from '@anticrm/contact'
  import core,{ Doc,DocumentQuery,FindOptions } from '@anticrm/core'
  import { Applicant } from '@anticrm/recruit'
  import task from '@anticrm/task'
  import { Button,Icon,IconAdd,Label,Scroller,SearchEdit,showPopup } from '@anticrm/ui'
import { BuildModelKey } from '@anticrm/view';
  import { Table } from '@anticrm/view-resources'
  import recruit from '../plugin'
  import CreateApplication from './CreateApplication.svelte'

  let search = ''
  let resultQuery: DocumentQuery<Doc> = {}
  const baseQuery: DocumentQuery<Applicant> = {
    doneState: null
  }

  const config: (BuildModelKey | string)[] = [
    '',
    '$lookup.space',
    '$lookup.attachedTo',
    '$lookup.assignee',
    '$lookup.state',
    {
      key: '',
      presenter: attachment.component.AttachmentsPresenter,
      label: attachment.string.Files,
      sortingKey: 'attachments'
    },
    { key: '', presenter: chunter.component.CommentsPresenter, label: chunter.string.Comments, sortingKey: 'comments' },
    'modifiedOn',
    '$lookup.attachedTo.$lookup.channels'
  ]

  const options: FindOptions<Applicant> = {
    lookup: {
      attachedTo: [recruit.mixin.Candidate, { _id: { channels: contact.class.Channel } }],
      state: task.class.State,
      assignee: contact.class.Employee,
      space: recruit.class.Vacancy
    }
  }

  function showCreateDialog (ev: Event) {
    showPopup(CreateApplication, { }, ev.target as HTMLElement)
  }

  function updateResultQuery (search: string): void {
    resultQuery = (search === '') ? baseQuery : { ...baseQuery,$search: search }
  }
</script>

<div class="ac-header full">
  <div class="ac-header__wrap-title">
    <div class="ac-header__icon"><Icon icon={recruit.icon.Application} size={'small'} /></div>
    <span class="ac-header__title"><Label label={recruit.string.Applications} /></span>
  </div>

  <SearchEdit bind:value={search} on:change={() => { updateResultQuery(search) }} />
  <Button icon={IconAdd} label={recruit.string.ApplicationCreateLabel} primary size={'small'} on:click={(ev) => showCreateDialog(ev)} />
</div>

<Scroller>
  <Table
    _class={recruit.class.Applicant}
    {config}
    {options}
    query={ resultQuery }
    showNotification
    highlightRows
  />
</Scroller>
