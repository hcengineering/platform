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
  import { getClient } from '@anticrm/presentation'
  import type { Issue, Team } from '@anticrm/tracker'
  import { Icon, showPanel } from '@anticrm/ui'
  import tracker from '../../plugin'

  export let value: Issue
  export let currentTeam: Team
  export let inline: boolean = false

  const client = getClient()
  const shortLabel = client.getHierarchy().getClass(value._class).shortLabel

  $: issueName = `${currentTeam.identifier}-${value.number}`

  const handleIssuePreviewOpened = () => {
    showPanel(tracker.component.PreviewIssue, value._id, value._class, 'content')
  }
</script>

{#if value && shortLabel}
  <div class="flex-presenter issuePresenterRoot" class:inline-presenter={inline} on:click={handleIssuePreviewOpened}>
    <div class="icon">
      <Icon icon={tracker.icon.Issue} size={'small'} />
    </div>
    <span title={issueName} class="label nowrap issueLabel">{issueName}</span>
  </div>
{/if}

<style lang="scss">
  .issuePresenterRoot {
    max-width: 5rem;
  }

  .issueLabel {
    display: block;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
