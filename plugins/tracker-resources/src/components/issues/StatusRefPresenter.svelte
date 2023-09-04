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
  import { Ref, Status, StatusValue } from '@hcengineering/core'
  import { Project } from '@hcengineering/tracker'
  import { statusStore } from '@hcengineering/view-resources'
  import StatusPresenter from './StatusPresenter.svelte'

  export let value: Ref<Status> | StatusValue | undefined
  export let space: Ref<Project>
  export let size: 'small' | 'medium' = 'medium'
  export let kind: 'list-header' | undefined = undefined
  export let colorInherit: boolean = false
  export let accent: boolean = false

  $: statusValue = $statusStore.get(typeof value === 'string' ? value : (value?.values?.[0]?._id as Ref<Status>))
</script>

{#if value}
  <StatusPresenter {space} value={statusValue} {size} {kind} {colorInherit} {accent} on:accent-color />
{/if}
