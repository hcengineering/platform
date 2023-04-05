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
  import core, { FindOptions, Ref, SortingOrder, Space } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Applicant } from '@hcengineering/recruit'
  import task from '@hcengineering/task'
  import { Loading } from '@hcengineering/ui'
  import view, { Viewlet, ViewletPreference } from '@hcengineering/view'
  import { Table } from '@hcengineering/view-resources'
  import recruit from '../plugin'

  export let value: Ref<Space>

  const options: FindOptions<Applicant> = {
    lookup: {
      state: task.class.State,
      space: core.class.Space,
      doneState: task.class.DoneState,
      attachedTo: recruit.mixin.Candidate
    },
    sort: {
      modifiedOn: SortingOrder.Descending
    },
    limit: 10
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

<div class="popup-table">
  {#if viewlet && !loading}
    <Table
      _class={recruit.class.Applicant}
      config={preference?.config ?? viewlet.config}
      {options}
      query={{ space: value }}
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
