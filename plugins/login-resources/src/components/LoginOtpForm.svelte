<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { type IntlString, OK, Severity, Status } from '@hcengineering/platform'
  import { LoginInfo } from '@hcengineering/account-client'

  import OtpForm from './OtpForm.svelte'
  import login from '../plugin'
  import Form from './Form.svelte'
  import { OtpLoginSteps, loginOtp } from '../index'

  export let navigateUrl: string | undefined = undefined
  export let signUpDisabled = false
  export let email: string | undefined = undefined
  export let caption: IntlString = login.string.LogIn
  export let subtitle: string | undefined = undefined
  export let onLogin: ((loginInfo: LoginInfo | null, status: Status) => void | Promise<void>) | undefined = undefined

  $: fields = [
    { id: 'email', name: 'username', i18n: login.string.Email, disabled: email !== undefined && email !== '' }
  ]
  const formData = {
    username: '' as string
  }

  $: if (email !== undefined && email !== '' && formData.username === '') {
    formData.username = email
  }

  let status = OK
  let step = OtpLoginSteps.Email
  let otpRetryOn = 0

  const action = {
    i18n: login.string.LogIn,
    func: async () => {
      status = new Status(Severity.INFO, login.status.ConnectingToServer, {})
      const [otpStatus, result] = await loginOtp(formData.username)
      status = otpStatus

      if (result?.sent === true && otpStatus === OK) {
        step = OtpLoginSteps.Otp
        otpRetryOn = result.retryOn
      }
    }
  }

  function handleStep (event: CustomEvent<OtpLoginSteps>): void {
    step = event.detail
  }
</script>

{#if step === OtpLoginSteps.Email}
  <Form
    {caption}
    {subtitle}
    {status}
    {fields}
    object={formData}
    {action}
    {signUpDisabled}
    ignoreInitialValidation
    withProviders
  />
{/if}

{#if step === OtpLoginSteps.Otp && formData.username !== ''}
  <OtpForm
    email={formData.username}
    {signUpDisabled}
    {navigateUrl}
    retryOn={otpRetryOn}
    {onLogin}
    canChangeEmail={email === undefined || email === ''}
    on:step={handleStep}
  />
{/if}
