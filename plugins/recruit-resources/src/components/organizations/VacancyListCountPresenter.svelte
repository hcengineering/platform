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
  import { Organization } from '@hcengineering/contact'
  import { Doc, DocumentQuery, Ref } from '@hcengineering/core'
  import { Asset, IntlString } from '@hcengineering/platform'
  import { Vacancy, VacancyList } from '@hcengineering/recruit'
  import { AnySvelteComponent, Icon, tooltip } from '@hcengineering/ui'

  export let value: VacancyList
  export let values:
    | Map<Ref<Organization>, { count: number; modifiedOn: number; vacancies: Ref<Vacancy>[] }>
    | undefined
  export let resultQuery: DocumentQuery<Doc>

  export let label: IntlString
  export let component: AnySvelteComponent
  export let icon: Asset

  $: countValue = values?.get(value._id)
  $: count = countValue?.count ?? 0
</script>

{#if countValue && count > 0}
  <div
    class="sm-tool-icon"
    use:tooltip={{
      component,
      props: { value: countValue.vacancies, resultQuery }
    }}
  >
    <div class="icon">
      <Icon {icon} size={'small'} />
    </div>
    &nbsp;
    {values?.get(value._id)?.count ?? 0}
  </div>
{/if}
