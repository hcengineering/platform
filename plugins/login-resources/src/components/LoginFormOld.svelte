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
  import type { Platform } from '@anticrm/plugin'
  import { AuthStatusCodes } from '@anticrm/plugin'
  import { Severity, Status } from '@anticrm/status'
  import { getContext, onDestroy } from 'svelte'
  import type { LoginService } from '@anticrm/plugin-login'
  import login from '@anticrm/plugin-login'
  import Form from './Form.svelte'
  import { Button } from '@anticrm/ui'
  import type { ApplicationRouter } from '@anticrm/plugin-ui'
  // import { PlatformStatusCodes } from '@anticrm/foundation'

  // export let router: ApplicationRouter<ApplicationRoute>
  const object = { username: '', password: '', workspace: '', secondFactorCode: '' }
  let status: Status

  let loginActive = false
  let needSecondFactor = false
  const baseFields = [
    { name: 'username', i18n: 'Username' },
    {
      name: 'password',
      i18n: 'Password',
      password: true
    },
    { name: 'workspace', i18n: 'Workspace' }
  ]

  let fields: { [key: string]: any }
  $: fields = needSecondFactor ? baseFields.concat({ name: 'secondFactorCode', i18n: 'Confirm code' }) : baseFields

  const platform = getContext('platform') as Platform
  const loginService = platform.getPlugin(login.id)

  async function doLogin () {
    status = new Status(Severity.INFO, 0, 'Соединяюсь с сервером...')

    status = await (await loginService).doLogin(
      object.username,
      object.password,
      object.workspace,
      object.secondFactorCode
    )

    if (status.code === AuthStatusCodes.CLIENT_VALIDATE_REQUIRED) {
      needSecondFactor = true
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async function doSignup () {}

  async function checkLoginInfo (ls: LoginService) {
    const info = await ls.getLoginInfo()
    if (info) {
      loginActive = true
      object.username = info.email
      object.workspace = info.workspace
    }
  }

  let timer: number
  // Auto forward to default application
  const loginCheck = loginService.then(async (ls) => {
    await checkLoginInfo(ls)

    timer = setInterval(async () => {
      await checkLoginInfo(ls)
    }, 1000)
  })

  onDestroy(() => {
    if (timer) {
      clearInterval(timer)
    }
  })

  async function navigateApp (): Promise<void> {
    (await loginService).navigateApp()
  }

  async function logout (): Promise<void> {
    (await loginService).doLogout()
    loginActive = false
  }

  function navigateSetting (): void {
    // router.navigate({ route: 'setting' })
  }
</script>

{#await loginCheck then value}
  {#if loginActive}
    <div class="login-form-info">
      <div class="field">
        Logged in as: {object.username}
      </div>
      <div class="field">
        Workspace: {object.workspace}
      </div>
      <div class="actions">
        <Button width="100px" on:click={logout}>Logout</Button>
        <Button width="100px" on:click={navigateSetting}>Settings</Button>
        <Button width="100px" on:click={navigateApp}>Switch to Application</Button>
      </div>
    </div>
  {:else}
    <Form
      actions={[
        { i18n: 'Create Space', func: doSignup },
        { i18n: 'Login', func: doLogin }
      ]}
      {fields}
      {object}
      caption="Login into system"
      {status} />
  {/if}
{/await}

<style lang="scss">
  .login-form-info {
    margin: 20vh auto auto;
    width: 30em;
    padding: 2em;
    border-radius: 1em;
    border: 1px solid var(--theme-bg-accent-color);
    .actions {
      display: flex;
      margin-top: 1.5em;
    }
  }
</style>
