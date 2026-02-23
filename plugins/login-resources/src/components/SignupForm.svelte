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
  import { OK, Severity, Status } from '@hcengineering/platform'
  import { logIn } from '@hcengineering/workbench'
  import { signupStore } from '@hcengineering/analytics-providers'

  import BottomActionComponent from './BottomAction.svelte'
  import login from '../plugin'
  import { getPasswordValidationRules } from '../validations'
  import { goTo } from '../utils'
  import Form from './Form.svelte'
  import { OtpLoginSteps, signUp, signUpOtp, type BottomAction } from '../index'
  import type { Field } from '../types'
  import OtpForm from './OtpForm.svelte'
  import { onMount } from 'svelte'

  export let signUpDisabled = false
  export let localLoginHidden = false
  export let navigateUrl: string | undefined = undefined
  export let useOTP = true // False only for dev/tests

  let fields: Array<Field>
  let form: Form
  let withPassword = !useOTP

  $: {
    fields = [
      { id: 'given-name', name: 'first', i18n: login.string.FirstName, short: true },
      { id: 'family-name', name: 'last', i18n: login.string.LastName, short: true },
      { id: 'email', name: 'username', i18n: login.string.Email }
    ]

    if (withPassword) {
      fields.push({
        id: 'new-password',
        name: 'password',
        i18n: login.string.Password,
        password: true,
        rules: getPasswordValidationRules()
      })
      fields.push({ id: 'new-password', name: 'password2', i18n: login.string.PasswordRepeat, password: true })
    }
  }

  const object = {
    first: '',
    last: '',
    username: '',
    password: '',
    password2: ''
  }

  let status: Status<any> = OK
  let step = OtpLoginSteps.Email
  let otpRetryOn = 0

  if (signUpDisabled || localLoginHidden) {
    goTo('login')
  }

  onMount(() => {
    signupStore.setSignUpFlow(true)
  })

  const action = {
    i18n: login.string.SignUp,
    func: async () => {
      if (useOTP) {
        status = new Status(Severity.INFO, login.status.ConnectingToServer, {})

        const [otpStatus, result] = await signUpOtp(object.username, object.first, object.last)
        status = otpStatus

        if (result?.sent === true && otpStatus === OK) {
          step = OtpLoginSteps.Otp
          otpRetryOn = result.retryOn
        }
      } else {
        const [loginStatus, result] = await signUp(object.username, object.password, object.first, object.last)

        status = loginStatus

        if (result != null) {
          await logIn(result)
          goTo('confirmationSend')
        }
      }
    }
  }

  let withPasswordAction: BottomAction
  $: withPasswordAction = {
    i18n: withPassword ? login.string.SetPasswordLater : login.string.SetPasswordNow,
    func: () => {
      withPassword = !withPassword
      step = OtpLoginSteps.Email

      setTimeout(() => {
        if (form != null) {
          form.invalidate()
        }
      }, 0)
    }
  }

  function handleStep (event: CustomEvent<OtpLoginSteps>): void {
    step = event.detail
  }
</script>

{#if step === OtpLoginSteps.Email}
  <Form bind:this={form} caption={login.string.SignUp} {status} {fields} {object} {action} withProviders />
{/if}

{#if step === OtpLoginSteps.Otp && object.username !== ''}
  <OtpForm
    email={object.username}
    {signUpDisabled}
    {navigateUrl}
    loginState="signup"
    password={object.password}
    retryOn={otpRetryOn}
    on:step={handleStep}
  />
{/if}

{#if useOTP}
  <div class="action">
    <BottomActionComponent action={withPasswordAction} />
  </div>
{:else}
  <div class="placeholder" />
{/if}

<style lang="scss">
  .action {
    margin-left: 5rem;
  }

  // TODO: Refactor me please
  .placeholder {
    height: 1.125rem;
  }
</style>
