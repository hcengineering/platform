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
  import type { Candidate } from '@hcengineering/recruit'
  import { Label } from '@hcengineering/ui'
  import { DocNavLink, ObjectPresenter, Table } from '@hcengineering/view-resources'
  import recruit from '../plugin'

  export let value: Candidate
</script>

<div class="flex flex-between flex-grow p-1 mb-4">
  <div class="fs-title">
    <Label label={recruit.string.Applications} />
  </div>
  <DocNavLink object={value}>
    <ObjectPresenter _class={value._class} objectId={value._id} {value} />
  </DocNavLink>
</div>
<div class="popup-table">
  <Table
    _class={recruit.class.Applicant}
    config={['', '$lookup.space.name', '$lookup.space.company', 'status', 'doneState']}
    query={{ attachedTo: value._id }}
    loadingProps={{ length: value.applications ?? 0 }}
  />
</div>

<style lang="scss">
  .popup-table {
    overflow: auto;
    max-height: 30rem;
  }
</style>
