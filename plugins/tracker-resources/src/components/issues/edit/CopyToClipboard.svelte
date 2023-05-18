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
  import view from '@hcengineering/view'
  import tracker from '../../../plugin'
  import CopyToClipboardButton from './CopyToClipboardButton.svelte'

  export let issueUrl: string | undefined = undefined
  export let issueId: string | undefined = undefined
  export let issueBranch: string | undefined = undefined
</script>

{#if issueUrl}
  <CopyToClipboardButton icon={view.icon.CopyLink} title={tracker.string.CopyIssueUrl} text={issueUrl} />
{/if}

{#if issueId}
  <CopyToClipboardButton icon={view.icon.CopyId} title={tracker.string.CopyIssueId} text={issueId} />
{/if}

{#if issueBranch}
  <CopyToClipboardButton icon={tracker.icon.CopyBranch} title={tracker.string.CopyIssueBranch} text={issueBranch} />
{/if}
