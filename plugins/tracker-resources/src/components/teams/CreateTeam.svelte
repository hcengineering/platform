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
  import { createEventDispatcher } from 'svelte'
  import { AnySvelteComponent, Button, EditBox, eventToHTMLElement, Label, showPopup, ToggleWithLabel } from '@hcengineering/ui'
  import { getClient, SpaceCreateCard } from '@hcengineering/presentation'
  import core, { getCurrentAccount, Ref } from '@hcengineering/core'
  import { IssueStatus } from '@hcengineering/tracker'
  import { StyledTextBox } from '@hcengineering/text-editor'
  import { Asset } from '@hcengineering/platform'
  import tracker from '../../plugin'
  import TeamIconChooser from './TeamIconChooser.svelte'
  import TeamPresenter from './TeamPresenter.svelte'

  let name: string = ''
  let description: string = ''
  let isPrivate: boolean = false
  let icon: Asset | undefined = undefined

  const dispatch = createEventDispatcher()
  const client = getClient()

  async function createTeam () {
    await client.createDoc(tracker.class.Team, core.space.Space, {
      name,
      description,
      private: isPrivate,
      members: [getCurrentAccount()._id],
      archived: false,
      identifier: name.toUpperCase().replaceAll(' ', '_'),
      sequence: 0,
      issueStatuses: 0,
      defaultIssueStatus: '' as Ref<IssueStatus>,
      icon,
      presenter: TeamPresenter
    })
  }

  function chooseIcon (ev: MouseEvent) {
    showPopup(TeamIconChooser, { icon }, eventToHTMLElement(ev), (result) => {
      if (result !== undefined && result !== null) {
        icon = result
      }
    })
  }
</script>

<SpaceCreateCard
  label={tracker.string.NewTeam}
  okAction={createTeam}
  canSave={name.length > 0}
  on:close={() => {
    dispatch('close')
  }}
>
  <EditBox bind:value={name} placeholder={tracker.string.TeamTitlePlaceholder} kind={'large-style'} focus />
  <StyledTextBox
    alwaysEdit
    showButtons={false}
    bind:content={description}
    placeholder={tracker.string.IssueDescriptionPlaceholder}
  />
  <ToggleWithLabel
    label={tracker.string.MakePrivate}
    description={tracker.string.MakePrivateDescription}
    bind:on={isPrivate}
  />
  <div class="flex-between">
    <div class="caption">
      <Label label={tracker.string.ChooseIcon} />
    </div>
    <Button icon={icon ?? tracker.icon.Home} kind="no-border" size="medium" on:click={chooseIcon} />
  </div>
</SpaceCreateCard>
