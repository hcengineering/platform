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
  import core from '@anticrm/core'
  import type { Candidate } from '@anticrm/recruit'
  import recruit from '@anticrm/recruit'
  import { Table } from '@anticrm/view-resources'

  export let value: Candidate
</script>

<Table
  _class={recruit.class.Applicant}
  config={['', '$lookup.space.name', '$lookup.state']}
  options={{
    lookup: {
      state: core.class.State,
      space: core.class.Space
    }
  }}
  query={{ attachedTo: value._id }}
/>
