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
  import { WithLookup } from '@hcengineering/core'
  import type { Vacancy } from '@hcengineering/recruit'
  import VacancyCard from './VacancyCard.svelte'

  export let value: WithLookup<Vacancy>
  export let inline: boolean = false
</script>

{#if value}
  <VacancyCard vacancy={value} disabled {inline} />
{/if}
