<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import core, { FindOptions, SortingOrder } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Applicant, Vacancy } from '@hcengineering/recruit'
  import task from '@hcengineering/task'
  import { Button, Label, Loading } from '@hcengineering/ui'
  import view, { Viewlet, ViewletPreference } from '@hcengineering/view'
  import { DocNavLink, ObjectPresenter, Table } from '@hcengineering/view-resources'
  import recruit from '../plugin'

  export let value: Vacancy
  export let openList: () => void

  const options: FindOptions<Applicant> = {
    lookup: {
      status: task.class.State,
      space: core.class.Space,
      doneState: task.class.DoneState,
      attachedTo: recruit.mixin.Candidate
    },
    sort: {
      modifiedOn: SortingOrder.Descending
    },
    limit: 200
  }

  let viewlet: Viewlet | undefined
  let preference: ViewletPreference | undefined
  let loading = true

  const viewletQuery = createQuery()
  $: viewletQuery.query(view.class.Viewlet, { _id: recruit.viewlet.VacancyApplicationsShort }, (res) => {
    ;[viewlet] = res
  })

  const preferenceQuery = createQuery()

  $: viewlet &&
    preferenceQuery.query(
      view.class.ViewletPreference,
      {
        attachedTo: viewlet._id
      },
      (res) => {
        preference = res[0]
        loading = false
      },
      { limit: 1 }
    )
</script>

<div class="flex flex-between flex-grow p-1 mb-4">
  <div class="fs-title flex-row-center">
    <Label label={recruit.string.Applications} />
    <div class="ml-2">
      <Button label={recruit.string.OpenVacancyList} on:click={openList} size={'small'} kind={'link-bordered'} />
    </div>
  </div>
  <div class="flex-row-center">
    <DocNavLink object={value}>
      <ObjectPresenter _class={value._class} objectId={value._id} {value} />
    </DocNavLink>
  </div>
</div>

<div class="popup-table">
  {#if viewlet && !loading}
    <Table
      _class={recruit.class.Applicant}
      config={preference?.config ?? viewlet.config}
      query={{ space: value._id }}
      {options}
      loadingProps={{ length: 0 }}
    />
  {:else}
    <Loading />
  {/if}
</div>

<style lang="scss">
  .popup-table {
    overflow: auto;
    // width: 70rem;
    // max-width: 70rem !important;
    max-height: 30rem;
  }
</style>
