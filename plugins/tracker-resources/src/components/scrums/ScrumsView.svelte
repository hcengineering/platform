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
  import contact from '@hcengineering/contact'
  import { Ref, SortingOrder } from '@hcengineering/core'
  import { ScrumRecord, Project, Scrum } from '@hcengineering/tracker'
  import { Button, Icon, IconAdd, Label, showPopup } from '@hcengineering/ui'
  import { ActionContext, List } from '@hcengineering/view-resources'
  import tracker from '../../plugin'
  import NewScrum from './NewScrum.svelte'
  import RecordScrumPresenter from './RecordScrumPresenter.svelte'
  import ScrumDatePresenter from './ScrumDatePresenter.svelte'
  import ScrumPresenter from './ScrumPresenter.svelte'

  export let currentSpace: Ref<Project>
  export let activeScrumRecord: ScrumRecord | undefined

  const showCreateDialog = async () => {
    showPopup(NewScrum, { space: currentSpace, targetElement: null }, null)
  }

  const retrieveMembers = (s: Scrum) => s.members
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>

<div class="fs-title flex-between header">
  <Label label={tracker.string.Scrums} />
  <div class="flex-between flex-gap-2">
    <Button size="small" icon={IconAdd} label={tracker.string.Scrum} kind={'primary'} on:click={showCreateDialog} />
  </div>
</div>
<List
  _class={tracker.class.Scrum}
  query={{ space: currentSpace }}
  space={currentSpace}
  config={[
    { key: '', presenter: Icon, props: { icon: tracker.icon.Scrum, size: 'small' } },
    { key: '', presenter: ScrumPresenter, props: { kind: 'list' } },
    {
      key: '',
      presenter: contact.component.MembersPresenter,
      props: {
        kind: 'link',
        intlTitle: tracker.string.ScrumMembersTitle,
        intlSearchPh: tracker.string.ScrumMembersSearchPlaceholder,
        retrieveMembers
      }
    },
    { key: '', presenter: ScrumDatePresenter },
    { key: '', presenter: RecordScrumPresenter, props: { activeScrumRecord } },
    {
      key: 'modifiedOn',
      presenter: tracker.component.ModificationDatePresenter
    }
  ]}
  viewOptions={{ orderBy: ['beginTime', SortingOrder.Ascending], groupBy: [] }}
  disableHeader
/>

<style lang="scss">
  .header {
    padding: 0.5rem 0.75rem 0.5rem 2.25rem;
  }
</style>
