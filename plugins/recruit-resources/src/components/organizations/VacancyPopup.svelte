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
  import { Doc, DocumentQuery, FindOptions, Ref } from '@hcengineering/core'
  import recruit, { Vacancy } from '@hcengineering/recruit'
  import { Table } from '@hcengineering/view-resources'

  export let value: Ref<Vacancy>[]
  export let resultQuery: DocumentQuery<Doc>

  const options: FindOptions<Vacancy> = {
    limit: 200
  }
</script>

<div class="popup-table">
  <Table
    _class={recruit.class.Vacancy}
    config={['', 'modifiedOn']}
    {options}
    query={{ ...(resultQuery ?? {}), _id: { $in: value } }}
    loadingProps={{ length: 0 }}
  />
</div>

<style lang="scss">
  .popup-table {
    overflow: auto;
    // width: 70rem;
    // max-width: 70rem !important;
    max-height: 30rem;
  }
</style>
