<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { Ref } from '@hcengineering/core'
  import hr, { Department } from '@hcengineering/hr'
  import DepartmentPresenter from './DepartmentPresenter.svelte'
  import { createQuery } from '@hcengineering/presentation'

  export let value: Ref<Department>

  let department: Department | undefined

  const query = createQuery()
  query.query(hr.class.Department, { _id: value }, (result) => {
    department = result[0]
  })
</script>

{#if department}
  <DepartmentPresenter value={department} />
{/if}
