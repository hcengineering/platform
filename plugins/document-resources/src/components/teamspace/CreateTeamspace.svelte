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
  import { AccountArrayEditor } from '@hcengineering/contact-resources'
  import core, { Account, Data, DocumentUpdate, Ref, generateId, getCurrentAccount } from '@hcengineering/core'
  import { Teamspace } from '@hcengineering/document'
  import { Asset } from '@hcengineering/platform'
  import presentation, { Card, getClient } from '@hcengineering/presentation'
  import { StyledTextBox } from '@hcengineering/text-editor'
  import {
    Button,
    EditBox,
    IconWithEmoji,
    Label,
    Toggle,
    getColorNumberByText,
    getPlatformColorDef,
    getPlatformColorForTextDef,
    showPopup,
    themeStore
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { IconPicker } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import document from '../../plugin'

  export let teamspace: Teamspace | undefined = undefined

  export let namePlaceholder: string = ''
  export let descriptionPlaceholder: string = ''

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let name: string = teamspace?.name ?? namePlaceholder
  let description: string = teamspace?.description ?? descriptionPlaceholder
  let isPrivate: boolean = teamspace?.private ?? false
  let icon: Asset | undefined = teamspace?.icon ?? undefined
  let color = teamspace?.color ?? getColorNumberByText(name)
  let isColorSelected = false
  let members: Ref<Account>[] =
    teamspace?.members !== undefined ? hierarchy.clone(teamspace.members) : [getCurrentAccount()._id]

  const dispatch = createEventDispatcher()

  $: isNew = teamspace === undefined

  async function handleSave (): Promise<void> {
    if (isNew) {
      await createTeamspace()
    } else {
      await updateTeamspace()
    }
  }

  function getTeamspaceData (): Data<Teamspace> {
    return {
      name,
      description,
      private: isPrivate,
      members,
      archived: false,
      icon,
      color
    }
  }

  async function updateTeamspace (): Promise<void> {
    if (teamspace === undefined) {
      return
    }

    const teamspaceData = getTeamspaceData()
    const update: DocumentUpdate<Teamspace> = {}
    if (teamspaceData.name !== teamspace?.name) {
      update.name = teamspaceData.name
    }
    if (teamspaceData.description !== teamspace?.description) {
      update.description = teamspaceData.description
    }
    if (teamspaceData.private !== teamspace?.private) {
      update.private = teamspaceData.private
    }
    if (teamspaceData.icon !== teamspace?.icon) {
      update.icon = teamspaceData.icon
    }
    if (teamspaceData.color !== teamspace?.color) {
      update.color = teamspaceData.color
    }
    if (teamspaceData.members.length !== teamspace?.members.length) {
      update.members = teamspaceData.members
    } else {
      for (const member of teamspaceData.members) {
        if (teamspace.members.findIndex((p) => p === member) === -1) {
          update.members = teamspaceData.members
          break
        }
      }
    }

    if (Object.keys(update).length > 0) {
      await client.update(teamspace, update)
    }

    close()
  }

  async function createTeamspace (): Promise<void> {
    const teamspaceId = generateId<Teamspace>()
    const teamspaceData = getTeamspaceData()

    await client.createDoc(document.class.Teamspace, core.space.Space, { ...teamspaceData }, teamspaceId)

    close(teamspaceId)
  }

  function chooseIcon (ev: MouseEvent): void {
    const icons = [document.icon.Document, document.icon.Library]
    const update = (result: any): void => {
      if (result !== undefined && result !== null) {
        icon = result.icon
        color = result.color
        isColorSelected = true
      }
    }
    showPopup(IconPicker, { icon, color, icons }, 'top', update, update)
  }

  function close (id?: Ref<Teamspace>): void {
    dispatch('close', id)
  }
</script>

<Card
  label={isNew ? document.string.NewTeamspace : document.string.EditTeamspace}
  okLabel={isNew ? presentation.string.Create : presentation.string.Save}
  okAction={handleSave}
  canSave={name.length > 0 && !(members.length === 0 && isPrivate)}
  accentHeader
  width={'medium'}
  gap={'gapV-6'}
  onCancel={close}
  on:changeContent
>
  <div class="antiGrid">
    <div class="antiGrid-row">
      <div class="antiGrid-row__header">
        <Label label={document.string.TeamspaceTitle} />
      </div>
      <div class="padding">
        <EditBox
          bind:value={name}
          placeholder={document.string.TeamspaceTitlePlaceholder}
          kind={'large-style'}
          autoFocus
          on:input={() => {
            if (isNew) {
              color = isColorSelected ? color : getColorNumberByText(name)
            }
          }}
        />
      </div>
    </div>

    <div class="antiGrid-row">
      <div class="antiGrid-row__header topAlign">
        <Label label={document.string.Description} />
      </div>
      <div class="padding clear-mins">
        <StyledTextBox
          alwaysEdit
          showButtons={false}
          bind:content={description}
          placeholder={document.string.TeamspaceDescriptionPlaceholder}
        />
      </div>
    </div>
  </div>

  <div class="antiGrid">
    <div class="antiGrid-row">
      <div class="antiGrid-row__header">
        <Label label={document.string.ChooseIcon} />
      </div>
      <Button
        icon={icon === view.ids.IconWithEmoji ? IconWithEmoji : icon ?? document.icon.Teamspace}
        iconProps={icon === view.ids.IconWithEmoji
          ? { icon: color }
          : {
              fill:
                color !== undefined
                  ? getPlatformColorDef(color, $themeStore.dark).icon
                  : getPlatformColorForTextDef(name, $themeStore.dark).icon
            }}
        size={'large'}
        on:click={chooseIcon}
      />
    </div>

    <div class="antiGrid-row">
      <div class="antiGrid-row__header withDesciption">
        <Label label={presentation.string.MakePrivate} />
        <span><Label label={presentation.string.MakePrivateDescription} /></span>
      </div>
      <Toggle bind:on={isPrivate} disabled={!isPrivate && members.length === 0} />
    </div>

    <div class="antiGrid-row">
      <div class="antiGrid-row__header">
        <Label label={document.string.TeamspaceMembers} />
      </div>
      <AccountArrayEditor
        value={members}
        label={document.string.TeamspaceMembers}
        onChange={(refs) => (members = refs)}
        kind={'regular'}
        size={'large'}
      />
    </div>
  </div>
</Card>
