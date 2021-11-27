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
  import { Ref, Doc, SortingOrder } from '@anticrm/core'
  import { Table } from '@anticrm/view-resources'

  import chunter from '@anticrm/chunter'

  export let objectId: Ref<Doc>
</script>

<Table
  _class={chunter.class.Comment}
  config={['']}
  options={{ limit: 3, sort: { modifiedOn: SortingOrder.Descending } }}
  query={{ attachedTo: objectId }}
/>
