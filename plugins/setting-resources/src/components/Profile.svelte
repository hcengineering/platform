<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import contact, { combineName, getCurrentEmployee, getFirstName, getLastName } from '@hcengineering/contact'
  import { ChannelsEditor, EditableAvatar, personByIdStore } from '@hcengineering/contact-resources'
  import { getCurrentAccount, SocialIdType } from '@hcengineering/core'
  import login, { loginId } from '@hcengineering/login'
  import { getResource } from '@hcengineering/platform'
  import { AttributeEditor, MessageBox, getClient } from '@hcengineering/presentation'
  import {
    Breadcrumb,
    Button,
    EditBox,
    FocusHandler,
    Header,
    createFocusManager,
    showPopup,
    navigate
  } from '@hcengineering/ui'
  import { logIn, logOut } from '@hcengineering/workbench-resources'

  import setting from '../plugin'

  const client = getClient()
  const account = getCurrentAccount()
  const me = getCurrentEmployee()
  const employee = $personByIdStore.get(me)
  const email = account.fullSocialIds.find((si) => si.type === SocialIdType.EMAIL)?.value ?? ''

  let firstName = employee !== undefined ? getFirstName(employee.name) : ''
  let lastName = employee !== undefined ? getLastName(employee.name) : ''

  let avatarEditor: EditableAvatar
  async function onAvatarDone (e: any): Promise<void> {
    if (employee === undefined) return

    if (employee.avatar != null) {
      await avatarEditor.removeAvatar(employee.avatar)
    }
    const avatar = await avatarEditor.createAvatar()
    await client.diffUpdate(employee, avatar)
  }

  const manager = createFocusManager()

  async function leave (): Promise<void> {
    showPopup(MessageBox, {
      label: setting.string.Leave,
      message: setting.string.LeaveDescr,
      action: async () => {
        const leaveWorkspace = await getResource(login.function.LeaveWorkspace)
        const loginInfo = await leaveWorkspace(account.uuid)

        if (loginInfo?.token != null) {
          await logIn(loginInfo)
          navigate({ path: [loginId, 'selectWorkspace'] })
        } else {
          await logOut()
          navigate({ path: [loginId, 'login'] })
        }
      }
    })
  }

  async function nameChange (): Promise<void> {
    if (employee !== undefined) {
      await client.diffUpdate(employee, {
        name: combineName(firstName, lastName)
      })
    }
  }
</script>

<FocusHandler {manager} />

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={setting.icon.AccountSettings} label={setting.string.AccountSettings} size={'large'} isCurrent />
  </Header>
  <div class="ac-body p-10">
    {#if employee}
      <div class="flex flex-grow w-full">
        <div class="mr-8">
          <EditableAvatar
            person={employee}
            {email}
            size={'x-large'}
            name={employee.name}
            bind:this={avatarEditor}
            on:done={onAvatarDone}
          />
        </div>
        <div class="flex-grow flex-col">
          <EditBox
            placeholder={contact.string.PersonFirstNamePlaceholder}
            bind:value={firstName}
            kind={'large-style'}
            autoFocus
            focusIndex={1}
            on:change={nameChange}
          />
          <EditBox
            placeholder={contact.string.PersonLastNamePlaceholder}
            bind:value={lastName}
            kind={'large-style'}
            focusIndex={2}
            on:change={nameChange}
          />
          <div class="location">
            <AttributeEditor
              maxWidth="20rem"
              _class={contact.class.Person}
              object={employee}
              focusIndex={3}
              key="city"
            />
          </div>
          <div class="separator" />
          <ChannelsEditor
            attachedTo={employee._id}
            attachedClass={employee._class}
            focusIndex={10}
            allowOpen={false}
            restricted={[contact.channelProvider.Email]}
          />
        </div>
      </div>
    {/if}
    <div class="footer">
      <Button
        icon={setting.icon.Signout}
        label={setting.string.Leave}
        on:click={() => {
          void leave()
        }}
      />
    </div>
  </div>
</div>

<style lang="scss">
  .location {
    margin-top: 0.25rem;
    font-size: 0.75rem;
  }

  .separator {
    margin: 1rem 0;
    height: 1px;
    background-color: var(--divider-color);
  }

  .footer {
    align-self: flex-end;
  }
</style>
