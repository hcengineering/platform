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
  import { getName } from '@hcengineering/contact'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Applicant, Candidate, Vacancy } from '@hcengineering/recruit'
  import recruit from '../plugin'

  export let value: Applicant

  const spaceQuery = createQuery()
  const candidateQuery = createQuery()
  let currentVacancy: Vacancy | undefined = undefined
  let candidate: Candidate | undefined = undefined
  const client = getClient()
  const hierarchy = client.getHierarchy()
  $: spaceQuery.query(recruit.class.Vacancy, { _id: value.space }, (res) => ([currentVacancy] = res))
  const shortLabel = value && hierarchy.getClass(value._class).shortLabel

  $: candidateQuery.query(recruit.mixin.Candidate, { _id: value.attachedTo }, (res) => ([candidate] = res))

  $: title = `${shortLabel}-${value?.number}`
</script>

{#if value}
  <div class="flex-col">
    <div class="flex-row-center crop-presenter">
      <span class="font-medium mr-2 whitespace-nowrap clear-mins">{title}</span>
      <span class="overflow-label">
        {currentVacancy?.name}
      </span>
    </div>
    <span class="overflow-label mt-10px">
      {candidate ? getName(client.getHierarchy(), candidate) : ''}
    </span>
  </div>
{/if}
