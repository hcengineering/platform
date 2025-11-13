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
  import contact, { combineName, getFirstName, getLastName } from '@hcengineering/contact'
  import { ChannelsEditor, EditableAvatar, myEmployeeStore } from '@hcengineering/contact-resources'
  import { getCurrentAccount, SocialIdType } from '@hcengineering/core'
  import login, { loginId } from '@hcengineering/login'
  import { getResource } from '@hcengineering/platform'
  import { AttributeEditor, createQuery, getClient, hasResource, MessageBox } from '@hcengineering/presentation'
  import {
    Breadcrumb,
    Button,
    Component,
    createFocusManager,
    EditBox,
    FocusHandler,
    Header,
    navigate,
    Scroller,
    showPopup
  } from '@hcengineering/ui'
  import { logIn, logOut } from '@hcengineering/workbench-resources'
  import { Analytics } from '@hcengineering/analytics'

  import rating, { type PersonRating } from '@hcengineering/rating'
  import setting from '../plugin'
  import SocialIdsEditor from './socialIds/SocialIdsEditor.svelte'

  const client = getClient()
  const account = getCurrentAccount()
  const email = account.fullSocialIds.find((si) => si.type === SocialIdType.EMAIL)?.value ?? ''

  const levelQuery = createQuery()

  let personRating: PersonRating | undefined

  levelQuery.query(rating.class.PersonRating, { accountId: account.uuid }, (res) => {
    personRating = res[0]
  })

  $: console.log('SYS', personRating)

  let firstName = ''
  let lastName = ''
  let initialized = false
  let userHasEdited = false
  let saveTimeout: any

  // Initialize names only once when store value changes from undefined
  // not to interfere with further user editing
  $: if ($myEmployeeStore !== undefined && !initialized && !userHasEdited) {
    firstName = getFirstName($myEmployeeStore.name)
    lastName = getLastName($myEmployeeStore.name)
    initialized = true
  }

  // Debounced auto-save while typing
  $: if (initialized && userHasEdited) {
    clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      void saveNameChange(firstName, lastName)
    }, 1000)
  }

  async function saveNameChange (first: string, last: string): Promise<void> {
    if ($myEmployeeStore === undefined) return

    const newName = combineName(first, last)
    if (newName === $myEmployeeStore.name) return

    try {
      await client.diffUpdate($myEmployeeStore, { name: newName })
    } catch (err: any) {
      Analytics.handleError(err)
      console.error('Failed to update name:', err)
    }
  }

  function handleInput (): void {
    userHasEdited = true
  }

  async function handleBlur (): Promise<void> {
    clearTimeout(saveTimeout)
    if (userHasEdited) {
      await saveNameChange(firstName, lastName)
    }
  }

  let avatarEditor: EditableAvatar
  async function onAvatarDone (): Promise<void> {
    if ($myEmployeeStore === undefined) return

    if ($myEmployeeStore.avatar != null) {
      await avatarEditor.removeAvatar($myEmployeeStore.avatar)
    }
    const avatar = await avatarEditor.createAvatar()
    await client.diffUpdate($myEmployeeStore, avatar)
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
          navigate({ path: [loginId] })
        }
      }
    })
  }
</script>

<FocusHandler {manager} />

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={setting.icon.AccountSettings} label={setting.string.AccountSettings} size={'large'} isCurrent />
  </Header>
  <Scroller>
    <div class="ac-body p-10 flex-col max-w-240 content">
      {#if $myEmployeeStore}
        <div class="flex flex-grow w-full">
          <div class="mr-8 flex-col items-center">
            <EditableAvatar
              person={$myEmployeeStore}
              {email}
              size={'x-large'}
              name={$myEmployeeStore.name}
              bind:this={avatarEditor}
              on:done={onAvatarDone}
            />
            {#if hasResource(rating.component.RatingRing)}
              <div class="flex-row-center">
                <Component
                  is={rating.component.RatingRing}
                  props={{ rating: personRating?.rating ?? 0, showValues: true }}
                />
              </div>
            {/if}
          </div>
          <div class="flex-grow flex-col">
            <EditBox
              placeholder={contact.string.PersonFirstNamePlaceholder}
              bind:value={firstName}
              kind={'large-style'}
              autoFocus
              focusIndex={1}
              on:input={handleInput}
              on:blur={handleBlur}
            />
            <EditBox
              placeholder={contact.string.PersonLastNamePlaceholder}
              bind:value={lastName}
              kind={'large-style'}
              focusIndex={2}
              on:input={handleInput}
              on:blur={handleBlur}
            />
            <div class="location">
              <AttributeEditor
                maxWidth="20rem"
                _class={contact.class.Person}
                object={$myEmployeeStore}
                focusIndex={3}
                key="city"
              />
            </div>
            <div class="separator" />
            <ChannelsEditor
              attachedTo={$myEmployeeStore._id}
              attachedClass={$myEmployeeStore._class}
              focusIndex={10}
              allowOpen={false}
              restricted={[contact.channelProvider.Email]}
            />
          </div>
        </div>
      {/if}
      <div class="separator" />
      {#if hasResource(rating.component.RatingRing)}
        {#if personRating != null}
          <div class="flex-row-center mt-2">
            <Component is={rating.component.RatingActivities} props={{ rating: personRating }} />
          </div>
        {/if}
        <div class="separator" />
      {/if}
      <SocialIdsEditor rating={personRating} />
      <div class="footer">
        <Button
          icon={setting.icon.Signout}
          label={setting.string.Leave}
          kind="dangerous"
          on:click={() => {
            void leave()
          }}
        />
      </div>
    </div>
  </Scroller>
</div>

<style lang="scss">
  .content {
    flex: 0 0 auto;
  }

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
    margin-top: 2rem;
    align-self: flex-end;
  }
</style>
