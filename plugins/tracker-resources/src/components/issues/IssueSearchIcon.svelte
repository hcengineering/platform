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
  import { Ref, Space, Status } from '@hcengineering/core'
  import { statusStore } from '@hcengineering/view-resources'
  import { Project } from '@hcengineering/tracker'

  import IssueStatusIcon from './IssueStatusIcon.svelte'

  export let status: string | string[]
  export let space: Ref<Space> | Ref<Space>[]

  $: st = $statusStore.byId.get(Array.isArray(status) ? (status[0] as Ref<Status>) : (status as Ref<Status>))
  $: spaceProject = Array.isArray(space) ? (space[0] as Ref<Project>) : (space as Ref<Project>)
</script>

{#if st}
  <IssueStatusIcon value={st} size={'small'} space={spaceProject} />
{/if}
