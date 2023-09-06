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
  import { Issue } from '@hcengineering/tracker'
  import { Label } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import IssuePresenter from '../issues/IssuePresenter.svelte'

  export let value: Issue
  export let isOwnTx: boolean

  $: isSub = value.attachedTo !== tracker.ids.NoParent && !isOwnTx
</script>

<div class="lower">
  <Label label={isSub ? tracker.string.CreatedSubIssue : tracker.string.CreatedIssue} />
</div>
{#if !isOwnTx}
  <IssuePresenter {value} />
{/if}
