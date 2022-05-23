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
  import { Button } from '@anticrm/ui'
  import tracker from '../../../plugin'

  export let issueUrl: string | undefined = undefined
  export let issueId: string | undefined = undefined
  export let issueBranch: string | undefined = undefined

  function copy (text?: string): void {
    if (text) {
      navigator.clipboard.writeText(text)
    }
  }
</script>

{#if issueUrl}
  <Button
    icon={tracker.icon.Issue}
    title={tracker.string.CopyIssueUrl}
    width="min-content"
    size="small"
    kind="transparent"
    on:click={() => copy(issueUrl)}
  />
{/if}

{#if issueId}
  <Button
    icon={tracker.icon.Views}
    title={tracker.string.CopyIssueId}
    width="min-content"
    size="small"
    kind="transparent"
    on:click={() => copy(issueId)}
  />
{/if}

{#if issueBranch}
  <Button
    icon={tracker.icon.TrackerApplication}
    title={tracker.string.CopyIssueBranch}
    width="min-content"
    size="small"
    kind="transparent"
    on:click={() => issueBranch}
  />
{/if}
