<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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
  import { type BottomAction, LoginMethods } from '../index'
  import LoginPasswordForm from './LoginPasswordForm.svelte'
  import LoginOtpForm from './LoginOtpForm.svelte'
  import BottomActionComponent from './BottomAction.svelte'
  import { getMetadata } from '@hcengineering/platform'
  import login from '../plugin'

  export let navigateUrl: string | undefined = undefined
  export let signUpDisabled = false
  const defaultLoginMethod = getMetadata(login.metadata.DefaultLoginMethod) ?? 'otp'

  let method: LoginMethods = LoginMethods.Otp

  if (defaultLoginMethod === 'password') {
    method = LoginMethods.Password
  }

  function changeMethod(event: CustomEvent<LoginMethods>): void {
    method = event.detail
  }

  const loginWithPasswordAction: BottomAction = {
    i18n: login.string.LoginWithPassword,
    func: () => {
      method = LoginMethods.Password
    }
  }

  const loginWithCodeAction: BottomAction = {
    i18n: login.string.LoginWithCode,
    func: () => {
      method = LoginMethods.Otp
    }
  }
</script>

{#if method === LoginMethods.Otp}
  <LoginOtpForm {navigateUrl} {signUpDisabled} on:change={changeMethod} />
  <div class="action">
    <BottomActionComponent action={loginWithPasswordAction} />
  </div>
{:else}
  <LoginPasswordForm {navigateUrl} {signUpDisabled} on:change={changeMethod} />
  <div class="action">
    <BottomActionComponent action={loginWithCodeAction} />
  </div>
{/if}

<style lang="scss">
  .action {
    margin-left: 5rem;
  }
</style>
