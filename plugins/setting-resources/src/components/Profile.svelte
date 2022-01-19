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
  import presentation, {
    AttributeEditor,
    Channels,
    createQuery,
    EditableAvatar,
    getClient
  } from '@anticrm/presentation'

  import setting from '@anticrm/setting'
  import { CircleButton, EditBox, Icon, IconAdd, Label, showPopup } from '@anticrm/ui'
  import contact, { Employee, EmployeeAccount, getFirstName, getLastName } from '@anticrm/contact'
  import contactRes from '@anticrm/contact-resources/src/plugin'
  import { getCurrentAccount, Ref } from '@anticrm/core'
  import { getResource } from '@anticrm/platform'
  import attachment from '@anticrm/attachment'
  import { changeName } from '@anticrm/login-resources'
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

<div class="flex-col h-full">
  <div class="flex-row-center header">
    <div class="content-color mr-3"><Icon icon={setting.icon.EditProfile} size={'medium'} /></div>
    <div class="fs-title"><Label label={setting.string.EditProfile} /></div>
  </div>
  {#if employee}
    <div class="container flex-row-streach flex-grow">
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

        <div class="flex-between channels">
          <div class="flex-row-center">
            {#if !employee.channels || employee.channels.length === 0}
              <CircleButton
                icon={IconAdd}
                size={'small'}
                selected
                on:click={(ev) =>
                  showPopup(
                    contact.component.SocialEditor,
                    { values: employee?.channels ?? [] },
                    ev.target,
                    (result) => {
                      saveChannels(result)
                    }
                  )}
              />
              <span><Label label={presentation.string.AddSocialLinks} /></span>
            {:else}
              <Channels value={employee.channels} size={'small'} />
              <div class="ml-1">
                <CircleButton
                  icon={contact.icon.Edit}
                  size={'small'}
                  selected
                  on:click={(ev) =>
                    showPopup(
                      contact.component.SocialEditor,
                      { values: employee?.channels ?? [] },
                      ev.target,
                      (result) => {
                        saveChannels(result)
                      }
                    )}
                />
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .header {
    padding: 0 1.75rem 0 2.5rem;
    height: 4rem;
    min-height: 4rem;
    border-bottom: 1px solid var(--theme-menu-divider);
  }

  .container {
    padding: 2.5rem;
  }
  .location {
    margin-top: 0.25rem;
    font-size: 0.75rem;
  }

  .name {
    font-weight: 500;
    font-size: 1.25rem;
    color: var(--theme-caption-color);
  }
  .channels {
    margin-top: 0.75rem;
    span {
      margin-left: 0.5rem;
    }
  }

  .separator {
    margin: 1rem 0;
    height: 1px;
    background-color: var(--theme-card-divider);
  }
</style>
