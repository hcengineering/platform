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
  import { Ref, TxUpdateDoc } from '@hcengineering/core'
  import { Issue, Project } from '@hcengineering/tracker'
  import { statusStore } from '@hcengineering/view-resources'
  import IssueStatusIcon from '../issues/IssueStatusIcon.svelte'

  export let tx: TxUpdateDoc<Issue>
  $: value = tx.operations.status

  $: status = value && $statusStore.get(value)

  $: space = tx.objectSpace as Ref<Project>
</script>

<div class="icon">
  {#if status}
    <IssueStatusIcon value={status} {space} size="small" on:accent-color />
  {/if}
</div>
