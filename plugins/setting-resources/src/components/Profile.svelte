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
  import { AttributeEditor, createQuery, EditableAvatar, getClient } from '@hcengineering/presentation'

  import setting from '../plugin'
  import { EditBox, Icon, Label, createFocusManager, FocusHandler, Button, showPopup } from '@hcengineering/ui'
  import contact, { Employee, EmployeeAccount, getFirstName, getLastName } from '@hcengineering/contact'
  import contactRes from '@hcengineering/contact-resources/src/plugin'
  import { getCurrentAccount } from '@hcengineering/core'
  import { changeName, leaveWorkspace } from '@hcengineering/login-resources'
  import { ChannelsEditor } from '@hcengineering/contact-resources'
  import MessageBox from '@hcengineering/presentation/src/components/MessageBox.svelte'
  const client = getClient()

  let avatarEditor: EditableAvatar

  let employee: Employee | undefined
  let firstName: string
  let lastName: string
  let displayName: string = ''
  const employeeQ = createQuery()

  const account = getCurrentAccount() as EmployeeAccount

  employeeQ.query(
    contact.class.Employee,
    {
      _id: account.employee
    },
    (res) => {
      employee = res[0]
      firstName = getFirstName(employee.name)
      lastName = getLastName(employee.name)
      displayName = employee.displayName ?? ''
    },
    { limit: 1 }
  )

  async function onAvatarDone (e: any) {
    if (employee === undefined) return

    if (employee.avatar) {
      await avatarEditor.removeAvatar(employee.avatar)
    }
    const avatar = await avatarEditor.createAvatar()
    await client.updateDoc(employee._class, employee.space, employee._id, {
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
          await leaveWorkspace(getCurrentAccount().email)
        }
      }
    )
  }

  function changeDisplayName () {
    if (employee) {
      client.update(employee, {
        displayName: displayName === '' ? null : displayName
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
            id={employee._id}
            size={'x-large'}
            bind:this={avatarEditor}
            on:done={onAvatarDone}
          />
        </div>
        <div class="flex-grow flex-col">
          <EditBox
            placeholder={contactRes.string.PersonFirstNamePlaceholder}
            bind:value={firstName}
            kind={'large-style'}
            focus
            focusIndex={1}
            on:change={() => {
              changeName(firstName, lastName)
            }}
          />
          <EditBox
            placeholder={contactRes.string.PersonLastNamePlaceholder}
            bind:value={lastName}
            kind={'large-style'}
            focusIndex={2}
            on:change={() => {
              changeName(firstName, lastName)
            }}
          />
          <EditBox
            placeholder={contactRes.string.DisplayName}
            bind:value={displayName}
            kind={'large-style'}
            focusIndex={2}
            on:change={changeDisplayName}
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
    background-color: var(--theme-card-divider);
  }

  .footer {
    align-self: flex-end;
  }
</style>
