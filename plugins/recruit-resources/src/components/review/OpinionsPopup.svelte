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
  import type { Review } from '@hcengineering/recruit'
  import recruit from '@hcengineering/recruit'
  import { Table } from '@hcengineering/view-resources'

  export let value: Review
</script>

<Table
  _class={recruit.class.Opinion}
  config={['', 'value', 'description']}
  options={{}}
  query={{ attachedTo: value._id }}
  loadingProps={{ length: value.opinions ?? 0 }}
/>
