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
  import { createEventDispatcher } from 'svelte'
  import { ModernEditbox, ButtonMenu, Label, Modal, TextArea } from '@hcengineering/ui'
  import presentation, { getClient } from '@hcengineering/presentation'
  import core, { getCurrentAccount } from '@hcengineering/core'
  import contact, { getCurrentEmployee } from '@hcengineering/contact'

  import Lock from '../../icons/Lock.svelte'
  import chunter from '../../../plugin'
  import { openChannel } from '../../../navigation'

  const dispatch = createEventDispatcher()
  const client = getClient()

  const visibilityOptions = [
    {
      id: 'public',
      icon: chunter.icon.Hashtag,
      label: chunter.string.Public
    },
    {
      id: 'private',
      icon: Lock,
      label: chunter.string.Private
    }
  ]

  let selectedVisibilityId = visibilityOptions[0].id
  let channelName = ''
  let topic = ''
  let canSave = true

  $: visibilityIcon = visibilityOptions.find(({ id }) => id === selectedVisibilityId)?.icon ?? visibilityOptions[0].icon
  $: visibilityLabel =
    visibilityOptions.find(({ id }) => id === selectedVisibilityId)?.label ?? visibilityOptions[0].label

  $: canSave = !!channelName

  async function save (): Promise<void> {
    const myAcc = getCurrentAccount().uuid
    const employee = getCurrentEmployee()
    const space = await client.findOne(contact.class.PersonSpace, { person: employee }, { projection: { _id: 1 } })
    if (!space) return

    const channelId = await client.createDoc(chunter.class.Channel, core.space.Space, {
      name: channelName,
      description: '',
      private: selectedVisibilityId === 'private',
      archived: false,
      members: [myAcc],
      topic,
      owners: [myAcc]
    })

    openChannel(channelId, chunter.class.Channel)
  }

  function handleCancel (): void {
    dispatch('close')
  }
</script>

<Modal
  label={chunter.string.NewChannel}
  type="type-popup"
  okLabel={presentation.string.Create}
  okAction={save}
  {canSave}
  onCancel={handleCancel}
  on:close
>
  <div class="hulyModal-content__titleGroup" style="padding: 0">
    <ModernEditbox bind:value={channelName} label={chunter.string.NewChannel} size="large" kind="ghost" />
    <TextArea
      placeholder={chunter.string.TopicOptional}
      width="100%"
      height="6.5rem"
      margin="var(--spacing-1) var(--spacing-2)"
      noFocusBorder
      bind:value={topic}
    />
  </div>
  <div class="hulyModal-content__settingsSet">
    <div class="hulyModal-content__settingsSet-line">
      <span class="label"><Label label={chunter.string.Visibility} /></span>
      <ButtonMenu
        items={visibilityOptions}
        selected={selectedVisibilityId}
        icon={visibilityIcon}
        label={visibilityLabel}
        kind="secondary"
        size="medium"
        on:selected={(ev) => {
          selectedVisibilityId = ev.detail
        }}
      />
    </div>
  </div>
</Modal>
