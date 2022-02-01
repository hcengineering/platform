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
  import {
    AttributeEditor,
    createQuery,
    EditableAvatar,
    getClient
  } from '@anticrm/presentation'

  import setting from '@anticrm/setting'
  import { EditBox, Icon, Label } from '@anticrm/ui'
  import contact, { Employee, EmployeeAccount, getFirstName, getLastName } from '@anticrm/contact'
  import contactRes from '@anticrm/contact-resources/src/plugin'
  import { getCurrentAccount, Ref } from '@anticrm/core'
  import { getResource } from '@anticrm/platform'
  import attachment from '@anticrm/attachment'
  import { changeName } from '@anticrm/login-resources'
  import { ChannelsEditor } from '@anticrm/contact-resources'
  const client = getClient()

  let account: EmployeeAccount | undefined
  let employee: Employee | undefined
  let firstName: string
  let lastName: string
  const accountQ = createQuery()
  const employeeQ = createQuery()
  $: accountQ.query(
    contact.class.EmployeeAccount,
    {
      _id: getCurrentAccount()._id as Ref<EmployeeAccount>
    },
    (res) => {
      account = res[0]
    },
    { limit: 1 }
  )

  $: account && updateQuery(account.employee)

  function updateQuery (id: Ref<Employee>): void {
    employeeQ.query(
      contact.class.Employee,
      {
        _id: id
      },
      (res) => {
        employee = res[0]
        firstName = getFirstName(employee.name)
        lastName = getLastName(employee.name)
      },
      { limit: 1 }
    )
  }

  function saveChannels (result: any) {
    if (employee !== undefined && result !== undefined) {
      employee.channels = result
      client.updateDoc(employee._class, employee.space, employee._id, { channels: result })
    }
  }

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
</script>

<div class="antiComponent">
  <div class="ac-header">
    <div class="ac-header__icon"><Icon icon={setting.icon.EditProfile} size={'medium'} /></div>
    <div class="ac-header__title"><Label label={setting.string.EditProfile} /></div>
  </div>
  {#if employee}
    <div class="ac-body columns p-10">
      <div class="mr-8">
        <EditableAvatar avatar={employee.avatar} size={'x-large'} on:done={onAvatarDone} />
      </div>
      <div class="flex-grow flex-col">
        <div class="flex-col">
          <div class="name">
            <EditBox
              placeholder={contactRes.string.PersonFirstNamePlaceholder}
              maxWidth="20rem"
              bind:value={firstName}
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
              on:change={() => {
                changeName(firstName, lastName)
              }}
            />
          </div>
          <div class="location">
            <AttributeEditor maxWidth="20rem" _class={contact.class.Person} object={employee} key="city" />
          </div>
        </div>

        <div class="separator" />

        <div class="flex-between mt-3">
          <div class="flex-row-center">
            <ChannelsEditor attachedTo={employee._id} attachedClass={employee._class} />
          </div>
        </div>
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
