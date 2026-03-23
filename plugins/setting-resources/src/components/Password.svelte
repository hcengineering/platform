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
  import { Analytics } from '@hcengineering/analytics'
  import login from '@hcengineering/login'
  import platform, { PlatformError, getResource } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'
  import setting from '@hcengineering/setting'
  import { Breadcrumb, Button, EditBox, Header, Icon, Label, Loading } from '@hcengineering/ui'
  import plugin from '../plugin'
  import Error from './icons/Error.svelte'
  import { onMount } from 'svelte'

  let oldPassword: string = ''
  let password: string = ''
  let password2: string = ''
  let label = presentation.string.Save
  let saved = false
  let error = false
  let hasPassword: boolean | undefined = undefined
  let checking = true
  let noEmailLinked = false
  let setupLinkSent = false
  let sendingLink = false

  $: disabled =
    checking ||
    password.length === 0 ||
    oldPassword.length === 0 ||
    oldPassword === password ||
    password !== password2 ||
    saved

  async function checkPassword (): Promise<void> {
    try {
      const check = await getResource(login.function.CheckHasPassword)
      hasPassword = await check()
    } catch {
      hasPassword = true // default to change-password form on error
    } finally {
      checking = false
    }
  }

  async function save (): Promise<void> {
    label = setting.string.Saving
    saved = true
    try {
      const changePassword = await getResource(login.function.ChangePassword)
      await changePassword(oldPassword, password)
      hasPassword = true
      label = setting.string.Saved
    } catch (e: any) {
      Analytics.handleError(e)
      label = presentation.string.Save
      saved = false
      error = true
    }
  }

  async function sendSetupLink (): Promise<void> {
    sendingLink = true
    noEmailLinked = false
    try {
      const requestSetup = await getResource(login.function.RequestPasswordSetup)
      await requestSetup()
      setupLinkSent = true
    } catch (e: any) {
      if (e instanceof PlatformError && e.status.code === platform.status.SocialIdNotFound) {
        noEmailLinked = true
      } else {
        Analytics.handleError(e)
        error = true
      }
    } finally {
      sendingLink = false
    }
  }

  function updateSaved (p1: string, p2: string, p3: string): void {
    saved = false
    label = presentation.string.Save
    error = false
  }
  $: updateSaved(oldPassword, password, password2)

  onMount(() => {
    void checkPassword()
  })
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb
      icon={setting.icon.Password}
      label={hasPassword === false ? login.string.SetPassword : login.string.ChangePassword}
      size={'large'}
      isCurrent
    />
  </Header>
  <div class="flex-row-stretch flex-grow p-10">
    <div class="flex-grow flex-col">
      {#if checking}
        <Loading />
      {:else if hasPassword === false}
        {#if error}
          <div class="flex-row-center gap-2 mb-4">
            <Icon icon={Error} size={'medium'} />
            <Label label={plugin.string.FailedToSave} />
          </div>
        {/if}
        {#if noEmailLinked}
          <p class="sso-hint">
            <Label label={login.string.SSONoEmailLinked} />
          </p>
        {:else if setupLinkSent}
          <p class="sso-hint">
            <Label label={login.string.SSOPasswordEmailSent} />
          </p>
        {:else}
          <p class="sso-hint mb-4">
            <Label label={login.string.SSOPasswordDescription} />
          </p>
          <div class="flex-row-reverse">
            <Button
              label={login.string.SendSetupLink}
              disabled={sendingLink}
              kind={'primary'}
              on:click={() => {
                void sendSetupLink()
              }}
            />
          </div>
        {/if}
      {:else}
        {#if error}
          <div class="flex-row-center gap-2">
            <Icon icon={Error} size={'medium'} />
            <Label label={plugin.string.FailedToSave} />
          </div>
        {/if}
        <div class="flex-grow flex-col">
          <div>
            <EditBox
              format="password"
              placeholder={login.string.EnterCurrentPassword}
              label={login.string.CurrentPassword}
              bind:value={oldPassword}
            />
          </div>
          <div class="mt-6">
            <EditBox
              format="password"
              placeholder={login.string.EnterNewPassword}
              label={login.string.NewPassword}
              bind:value={password}
            />
          </div>
          <div class="mt-6">
            <EditBox
              format="password"
              placeholder={login.string.RepeatNewPassword}
              label={login.string.NewPassword}
              bind:value={password2}
            />
          </div>
        </div>

        <div class="flex-row-reverse">
          <Button
            {label}
            {disabled}
            kind={'primary'}
            on:click={() => {
              void save()
            }}
          />
        </div>
      {/if}
    </div>
  </div>
</div>

<style lang="scss">
  .sso-hint {
    font-size: 0.8125rem;
    color: var(--theme-dark-color);
    line-height: 1.5;
  }
</style>
