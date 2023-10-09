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
  import contact, { Employee, PersonAccount, combineName, getFirstName, getLastName } from '@hcengineering/contact'
  import { ChannelsEditor, EditableAvatar, employeeByIdStore } from '@hcengineering/contact-resources'
  import { Ref, getCurrentAccount } from '@hcengineering/core'
  import login from '@hcengineering/login'
  import { getResource } from '@hcengineering/platform'
  import { AttributeEditor, getClient, MessageBox } from '@hcengineering/presentation'
  import { Button, createFocusManager, EditBox, FocusHandler, Icon, Label, showPopup } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import setting from '../plugin'
  const client = getClient()

  let avatarEditor: EditableAvatar

  const account = getCurrentAccount() as PersonAccount
  const employee = account !== undefined ? $employeeByIdStore.get(account.person as Ref<Employee>) : undefined
  let firstName = employee ? getFirstName(employee.name) : ''
  let lastName = employee ? getLastName(employee.name) : ''

  onDestroy(
    employeeByIdStore.subscribe((p) => {
      const emp = p.get(account.person as Ref<Employee>)
      if (emp) {
        firstName = getFirstName(emp.name)
        lastName = getLastName(emp.name)
      }
    })
  )

  async function onAvatarDone (e: any) {
    if (employee === undefined) return

    if (employee.avatar) {
      await avatarEditor.removeAvatar(employee.avatar)
    }
    const avatar = await avatarEditor.createAvatar()
    await client.update(employee, {
      avatar
    })
  }

  const manager = createFocusManager()

  async function leave (): Promise<void> {
    showPopup(
      MessageBox,
      {
        label: setting.string.Leave,
        message: setting.string.LeaveDescr
      },
      undefined,
      async (res?: boolean) => {
        if (res === true) {
          const leaveWorkspace = await getResource(login.function.LeaveWorkspace)
          await leaveWorkspace(getCurrentAccount().email)
        }
      }
    )
  }

  async function nameChange () {
    if (employee) {
      await client.update(employee, {
        name: combineName(firstName, lastName)
      })
    }
  }
</script>

<FocusHandler {manager} />

<div class="antiComponent">
  <div class="ac-header short divide">
    <div class="ac-header__icon"><Icon icon={setting.icon.EditProfile} size={'medium'} /></div>
    <div class="ac-header__title"><Label label={setting.string.EditProfile} /></div>
  </div>
  <div class="ac-body p-10">
    {#if employee}
      <div class="flex flex-grow w-full">
        <div class="mr-8">
          <EditableAvatar
            avatar={employee.avatar}
            email={account.email}
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
          leave()
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
