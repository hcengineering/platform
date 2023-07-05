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
  import { Ref, Space } from '@hcengineering/core'
  import { MultipleDraftController, getClient } from '@hcengineering/presentation'
  import { Button, IconAdd, showPopup } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { onDestroy } from 'svelte'
  import tracker from '../plugin'
  import CreateIssue from './CreateIssue.svelte'

  export let currentSpace: Ref<Space> | undefined

  let closed = true

  let draftExists = false

  const draftController = new MultipleDraftController(tracker.ids.IssueDraft)
  onDestroy(
    draftController.hasNext((res) => {
      draftExists = res
    })
  )
  async function newIssue (): Promise<void> {
    closed = false
    showPopup(CreateIssue, { space: currentSpace, shouldSaveDraft: true }, 'top', () => {
      closed = true
    })
  }

  $: label = draftExists || !closed ? tracker.string.ResumeDraft : tracker.string.NewIssue

  const client = getClient()

  let keys: string[] | undefined = undefined

  client.findOne(view.class.Action, { _id: tracker.action.NewIssue }).then((p) => (keys = p?.keyBinding))
</script>

<div class="antiNav-subheader">
  <Button
    icon={IconAdd}
    {label}
    justify={'left'}
    kind={'accented'}
    width={'100%'}
    size={'large'}
    on:click={newIssue}
    id="new-issue"
    showTooltip={{
      direction: 'bottom',
      label,
      keys
    }}
  >
    <div slot="content" class="draft-circle-container">
      {#if draftExists}
        <div class="draft-circle" />
      {/if}
    </div>
  </Button>
</div>

<style lang="scss">
  .draft-circle-container {
    margin-left: auto;
  }

  .draft-circle {
    height: 6px;
    width: 6px;
    background-color: var(--primary-bg-color);
    border-radius: 50%;
  }
</style>
