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
  import type { Platform } from '@anticrm/platform'
  import { Severity, Status } from '@anticrm/platform'
  import { getContext } from 'svelte'
  import login from '..'
  import { CheckBox } from '@anticrm/ui'
  import type { ApplicationRoute, ApplicationRouter } from '@anticrm/platform-ui'
  import twofactor from 'node-2fa'
  import type { Options } from 'node-2fa/dist/interfaces'

  export let router: ApplicationRouter<ApplicationRoute>
  const object = { oldPassword: '', newPassword: '', newPasswordConfirm: '', clientSecret: '', secondFactorCode: '' }
  let changePassword = false
  let status = new Status(Severity.OK, 0, '')

  const platform = getContext('platform') as Platform
  const loginService = platform.getPlugin(login.id)

  let secondFactorInitEnabled = false
  let secondFactorEnabled = false
  let secondFactorCurrentEnabled = false
  let newSecret:
    | {
        secret: string
        uri: string
        qr: string
      }
    | false
  let src: string

  $: secondFactorCurrentEnabled = secondFactorEnabled && !secondFactorInitEnabled
  $: newSecret = secondFactorCurrentEnabled && twofactor.generateSecret({ name: 'Anticrm' } as Options)
  $: src = newSecret.qr
  $: object.clientSecret = newSecret.secret

  const secondFactorCheck = loginService.then((ls) => {
    ls.getLoginInfo().then((li) => {
      secondFactorInitEnabled = !!li?.secondFactorEnabled
      secondFactorEnabled = secondFactorInitEnabled
    })
  })

  function navigateLoginForm (): Promise<void> {
    return Promise.resolve(router.navigate({ route: '' }))
  }

  let description: string
  $: description = status.message

  async function saveSetting (): Promise<void> {
    if (!object.oldPassword) {
      status = new Status(Severity.INFO, 0, 'Поле пароль обязательно к заполнению.')
      return
    }

    if (changePassword && object.newPassword !== object.newPasswordConfirm) {
      status = new Status(Severity.INFO, 0, 'Пароль и подтверждения пароля не совпадают')
      return
    }

    if (secondFactorCurrentEnabled) {
      if (object.clientSecret && !object.secondFactorCode) {
        status = new Status(Severity.INFO, 0, 'Поле код подтверждения обязательно для заполнения')
        return
      }

      if (!object.clientSecret && object.secondFactorCode) {
        status = new Status(Severity.INFO, 0, 'Поле секретный код обязательно для заполнения')
        return
      }
    }

    status = new Status(Severity.INFO, 0, 'Соединяюсь с сервером...')

    status = await (await loginService).saveSetting(
      object.oldPassword,
      changePassword ? object.newPassword : '',
      secondFactorEnabled,
      secondFactorCurrentEnabled ? object.clientSecret : '',
      secondFactorCurrentEnabled ? object.secondFactorCode : ''
    )
    if (status.severity === Severity.OK) {
      await navigateLoginForm()
    }
  }
</script>

<form class="form">
  <div class="status">{description}</div>
  <div class="field">
    <input class="editbox" name="oldPassword" placeholder="Пароль" type="password" bind:value={object.oldPassword} />
  </div>
  <div class="field">
    <CheckBox bind:checked={changePassword}>Изменить пароль</CheckBox>
  </div>
  {#if changePassword}
    <div class="field">
      <input
        class="editbox"
        name="newPassword"
        placeholder="Новый пароль"
        type="password"
        bind:value={object.newPassword} />
    </div>
    <div class="field">
      <input
        class="editbox"
        name="newPasswordConfirm"
        placeholder="Подтверждение пароля"
        type="password"
        bind:value={object.newPasswordConfirm} />
    </div>
  {/if}
  {#await secondFactorCheck then value}
    <div class="field">
      <CheckBox bind:checked={secondFactorEnabled}>Включить двухфакторную авторизацию</CheckBox>
    </div>
    {#if secondFactorCurrentEnabled}
      <div class="field">
        <input
          class="editbox"
          name="clientSecret"
          placeholder="Секретный код"
          type="text"
          bind:value={object.clientSecret} />
      </div>
      {#if src}
        <div>
          <img {src} alt="qr code" />
        </div>
      {/if}
      <div class="field">
        <input
          class="editbox"
          name="secondFactorCode"
          placeholder="Код подтверждения"
          type="text"
          bind:value={object.secondFactorCode} />
      </div>
    {/if}
  {/await}
  <div class="buttons">
    <button class="button" on:click|preventDefault={navigateLoginForm}> Отменить</button>
    <button class="button" on:click|preventDefault={saveSetting}> Сохранить</button>
  </div>
</form>

<style lang="scss">
  img {
    display: block;
    margin-left: auto;
    margin-right: auto;
    width: 50%;
    border: 1px;
    border-style: solid;
  }

  form {
    margin: auto;
    margin-top: 3vh;
    width: 30em;
    padding: 1em;
    border-radius: 1em;
    border: 1px solid var(--theme-bg-accent-color);
    .status {
      margin-top: 0.5em;
    }
    .field {
      .editbox {
        width: 100%;
      }
      margin: 1em 0;
    }
  }
</style>
