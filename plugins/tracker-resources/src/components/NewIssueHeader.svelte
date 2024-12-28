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
  import { Analytics } from '@hcengineering/analytics'
  import { AccountRole, Ref, Space, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
  import { MultipleDraftController, getClient } from '@hcengineering/presentation'
  import { TrackerEvents } from '@hcengineering/tracker'
  import { ButtonWithDropdown, IconAdd, IconDropdown, SelectPopupValueType, showPopup } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { TrackerEvents } from '@hcengineering/tracker'
  import { Analytics } from '@hcengineering/analytics'

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
    Analytics.handleEvent(TrackerEvents.NewIssueButtonClicked)
    showPopup(CreateIssue, { space: currentSpace, shouldSaveDraft: true }, 'top', () => {
      closed = true
    })
  }

  $: label = draftExists || !closed ? tracker.string.ResumeDraft : tracker.string.NewIssue
  $: dropdownItems = hasAccountRole(getCurrentAccount(), AccountRole.User)
    ? [
        {
          id: tracker.string.CreateProject,
          label: tracker.string.CreateProject
        },
        {
          id: tracker.string.NewIssue,
          label
        }
      ]
    : [
        {
          id: tracker.string.NewIssue,
          label
        }
      ]
  const client = getClient()

  let keys: string[] | undefined = undefined
  async function dropdownItemSelected (res?: SelectPopupValueType['id']): Promise<void> {
    if (res == null) return

    if (res === tracker.string.CreateProject) {
      closed = false
      showPopup(tracker.component.CreateProject, {}, 'top', () => {
        closed = true
      })
    } else {
      await newIssue()
    }
  }

  void client.findOne(view.class.Action, { _id: tracker.action.NewIssue }).then((p) => (keys = p?.keyBinding))
</script>

<div class="antiNav-subheader">
  <ButtonWithDropdown
    icon={IconAdd}
    justify={'left'}
    kind={'primary'}
    {label}
    on:click={newIssue}
    {dropdownItems}
    dropdownIcon={IconDropdown}
    on:dropdown-selected={(ev) => {
      dropdownItemSelected(ev.detail)
    }}
    mainButtonId={'new-issue'}
    showTooltipMain={{
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
  </ButtonWithDropdown>
</div>

<style lang="scss">
  .draft-circle-container {
    margin-left: auto;
    padding-right: 12px;
  }

  .draft-circle {
    height: 6px;
    width: 6px;
    background-color: var(--primary-bg-color);
    border-radius: 50%;
  }
</style>
