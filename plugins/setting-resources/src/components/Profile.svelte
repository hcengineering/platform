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
  import { AttributeEditor, createQuery, EditableAvatar, getClient } from '@anticrm/presentation'

  import setting from '@anticrm/setting'
  import { EditBox, Icon, Label, createFocusManager, FocusHandler } from '@anticrm/ui'
  import contact, { Employee, EmployeeAccount, getFirstName, getLastName } from '@anticrm/contact'
  import contactRes from '@anticrm/contact-resources/src/plugin'
  import { getCurrentAccount } from '@anticrm/core'
  import { getResource } from '@anticrm/platform'
  import attachment from '@anticrm/attachment'
  import { changeName } from '@anticrm/login-resources'
  import { ChannelsEditor } from '@anticrm/contact-resources'
  const client = getClient()

  let employee: Employee | undefined
  let firstName: string
  let lastName: string
  const employeeQ = createQuery()

  employeeQ.query(
    contact.class.Employee,
    {
      _id: (getCurrentAccount() as EmployeeAccount).employee
    },
    (res) => {
      employee = res[0]
      firstName = getFirstName(employee.name)
      lastName = getLastName(employee.name)
    },
    { limit: 1 }
  )

  async function onAvatarDone (e: any) {
    if (employee === undefined) return
    const uploadFile = await getResource(attachment.helper.UploadFile)
    const deleteFile = await getResource(attachment.helper.DeleteFile)
    const { file: avatar } = e.detail

    if (employee.avatar != null) {
      await deleteFile(employee.avatar)
    }
    const uuid = await uploadFile(avatar)
    await client.updateDoc(employee._class, employee.space, employee._id, {
      avatar: uuid
    })
  }

  async function removeAvatar (): Promise<void> {
    if (employee === undefined) return
    const deleteFile = await getResource(attachment.helper.DeleteFile)
    if (employee.avatar != null) {
      await client.updateDoc(employee._class, employee.space, employee._id, {
        avatar: null
      })
      await deleteFile(employee.avatar)
    }
  }

  const manager = createFocusManager()
</script>

<FocusHandler {manager} />

<div class="antiComponent">
  <div class="ac-header short divide">
    <div class="ac-header__icon"><Icon icon={setting.icon.EditProfile} size={'medium'} /></div>
    <div class="ac-header__title"><Label label={setting.string.EditProfile} /></div>
  </div>
  {#if employee}
    <div class="ac-body columns p-10">
      <div class="mr-8">
        <EditableAvatar avatar={employee.avatar} size={'x-large'} on:done={onAvatarDone} on:remove={removeAvatar} />
      </div>
      <div class="flex-grow flex-col">
        <div class="flex-col">
          <div class="name">
            <EditBox
              placeholder={contactRes.string.PersonFirstNamePlaceholder}
              maxWidth="20rem"
              bind:value={firstName}
              focus
              focusIndex={1}
              on:change={() => {
                changeName(firstName, lastName)
              }}
            />
          </div>
          <div class="name">
            <EditBox
              placeholder={contactRes.string.PersonLastNamePlaceholder}
              maxWidth="20rem"
              bind:value={lastName}
              focusIndex={2}
              on:change={() => {
                changeName(firstName, lastName)
              }}
            />
          </div>
          <div class="location">
            <AttributeEditor
              maxWidth="20rem"
              _class={contact.class.Person}
              object={employee}
              focusIndex={3}
              key="city"
            />
          </div>
        </div>
        <div class="separator" />
        <ChannelsEditor attachedTo={employee._id} attachedClass={employee._class} focusIndex={10} allowOpen={false} />
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .location {
    margin-top: 0.25rem;
    font-size: 0.75rem;
  }

  .name {
    font-weight: 500;
    font-size: 1.25rem;
    color: var(--theme-caption-color);
  }

  .separator {
    margin: 1rem 0;
    height: 1px;
    background-color: var(--theme-card-divider);
  }
</style>
