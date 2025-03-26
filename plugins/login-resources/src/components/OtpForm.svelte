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
  import { deviceOptionsStore as deviceInfo, Label, TimeLeft, CodeInput } from '@hcengineering/ui'
  import { OK, Severity, Status } from '@hcengineering/platform'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import { Timestamp } from '@hcengineering/core'
  import { LoginInfo } from '@hcengineering/account-client'

  import Tabs from './Tabs.svelte'
  import { BottomAction, doLoginNavigate, validateOtpLogin, OtpLoginSteps, loginOtp } from '../index'
  import login from '../plugin'
  import BottomActionComponent from './BottomAction.svelte'
  import StatusControl from './StatusControl.svelte'

  export let navigateUrl: string | undefined = undefined
  export let email: string
  export let retryOn: Timestamp
  export let signUpDisabled = false
  export let loginState: 'login' | 'signup' | 'none' = 'none'
  export let canChangeEmail = true
  export let onLogin: ((loginInfo: LoginInfo | null, status: Status) => void | Promise<void>) | undefined = undefined

  const dispatch = createEventDispatcher()

  const fields = [
    { id: 'otp1', name: 'otp1', optional: false },
    { id: 'otp2', name: 'otp2', optional: false },
    { id: 'otp3', name: 'otp3', optional: false },
    { id: 'otp4', name: 'otp4', optional: false },
    { id: 'otp5', name: 'otp5', optional: false },
    { id: 'otp6', name: 'otp6', optional: false }
  ]

  let status = OK

  const otpData: Record<string, string> = {
    otp1: '',
    otp2: '',
    otp3: '',
    otp4: '',
    otp5: '',
    otp6: ''
  }

  let formElement: HTMLFormElement | undefined

  function trim (field: string): void {
    otpData[field] = otpData[field].trim()
  }

  async function validateOtp (): Promise<void> {
    status = new Status(Severity.INFO, login.status.ConnectingToServer, {})

    const otp = otpData.otp1 + otpData.otp2 + otpData.otp3 + otpData.otp4 + otpData.otp5 + otpData.otp6
    const [loginStatus, result] = await validateOtpLogin(email, otp)
    status = loginStatus

    if (onLogin !== undefined) {
      void onLogin(result, status)
    } else {
      await doLoginNavigate(
        result,
        (st) => {
          status = st
        },
        navigateUrl
      )
    }
  }

  function onInput (e: Event): void {
    if (e.target == null) return

    const target = e.target as HTMLInputElement
    const { value } = target

    if (value == null || value === '') return

    if (value.length === fields.length) {
      pasteOtpCode(value)
    } else {
      const index = fields.findIndex(({ id }) => id === target.id)
      if (index === -1) return

      target.value = value[0]

      if (Object.values(otpData).every((v) => v !== '')) {
        void validateOtp()
        return
      }

      const nextField = fields[index + 1]
      if (nextField === undefined) return

      const nextInput = formElement?.querySelector(`input[name="${nextField.name}"]`) as HTMLInputElement
      if (nextInput != null) {
        nextInput.focus()
      }
    }
  }

  function clearOtpData (): void {
    Object.keys(otpData).forEach((key) => {
      otpData[key] = ''
    })

    const input = formElement?.querySelector(`input[name="${fields[0].name}"]`) as HTMLInputElement
    if (input != null) {
      input.focus()
    }
  }

  function onKeydown (e: KeyboardEvent): void {
    const key = e.key.toLowerCase()
    const target = e.target as HTMLInputElement

    if (key !== 'backspace' && key !== 'delete') return

    const index = fields.findIndex(({ id }) => id === target.id)
    if (index === -1) return
    const { value } = target

    status = OK
    target.value = ''
    otpData[fields[index].name] = ''

    if (value === '') {
      const prevField = fields[index - 1]
      if (prevField === undefined) return
      const prevInput = formElement?.querySelector(`input[name="${prevField.name}"]`) as HTMLInputElement
      if (prevInput != null) {
        prevInput.focus()
      }
    }
  }

  function onPaste (e: ClipboardEvent): void {
    e.preventDefault()

    if (e.clipboardData == null) return

    const text = e.clipboardData.getData('text')
    pasteOtpCode(text)
  }

  function pasteOtpCode (text: string): boolean {
    const digits = text.split('').filter((it) => it !== ' ')

    if (digits.length !== fields.length) {
      return false
    }

    let focusName: string | undefined = undefined

    for (const field of fields) {
      const digit = digits.shift()
      if (digit === undefined) break
      otpData[field.name] = digit
      focusName = field.name
    }

    if (focusName !== undefined && focusName !== '' && formElement) {
      const input = formElement.querySelector(`input[name="${focusName}"]`) as HTMLInputElement | undefined
      input?.focus()
    }

    if (Object.values(otpData).every((v) => v !== '')) {
      void validateOtp()
    }

    return true
  }

  $: if (formElement != null) {
    formElement.addEventListener('input', onInput)
    formElement.addEventListener('keydown', onKeydown)
    formElement.addEventListener('paste', onPaste)
    const firstInput = formElement.querySelector(`input[name="${fields[0].name}"]`) as HTMLInputElement | undefined
    firstInput?.focus()
  }

  onDestroy(() => {
    if (formElement !== undefined) {
      formElement.removeEventListener('input', onInput)
      formElement.removeEventListener('keydown', onKeydown)
      formElement.removeEventListener('paste', onPaste)
    }
  })

  async function resendCode (): Promise<void> {
    status = new Status(Severity.INFO, login.status.ConnectingToServer, {})
    const [otpStatus, result] = await loginOtp(email)
    status = otpStatus

    if (result?.sent === true && otpStatus === OK) {
      retryOn = result.retryOn
      clearOtpData()
      if (timer !== undefined) timer.restart(retryOn)
      canResend = false
    }
  }
  let canResend = false

  const changeEmailAction: BottomAction = {
    caption: login.string.WrongEmail,
    i18n: login.string.ChangeEmail,
    func: () => {
      dispatch('step', OtpLoginSteps.Email)
    }
  }

  const resendCodeAction: BottomAction = {
    caption: login.string.HaventReceivedCode,
    i18n: login.string.ResendCode,
    func: () => {
      void resendCode()
    }
  }

  let timer: TimeLeft | undefined
</script>

<form
  bind:this={formElement}
  class="container"
  style:padding={$deviceInfo.docWidth <= 480 ? '.25rem 1.25rem' : '4rem 5rem'}
  style:min-height={$deviceInfo.docHeight > 720 ? '42rem' : '0'}
>
  <div class="header">
    <Tabs {loginState} {signUpDisabled} />
    <div class="description">
      <Label label={login.string.SentTo} />
      <span class="email ml-1">
        {email}
      </span>
    </div>
  </div>

  <div class="form">
    {#each fields as field, index (field.name)}
      {#if index === 3}
        <div class="separator" />
      {/if}
      <div class={'form-row'}>
        <CodeInput
          id={field.id}
          name={field.name}
          size="medium"
          bind:value={otpData[field.name]}
          on:blur={() => {
            trim(field.name)
          }}
        />
      </div>
    {/each}
  </div>

  <div class="footer mt-6">
    <span class="flex-row-top">
      <Label label={login.string.CanFindCode} />
      <span class="time ml-2">
        <TimeLeft
          bind:this={timer}
          time={retryOn}
          on:timeout={() => {
            canResend = true
          }}
        />
      </span>
    </span>

    {#if canChangeEmail}
      <BottomActionComponent action={changeEmailAction} />
    {/if}
    {#if canResend}
      <BottomActionComponent action={resendCodeAction} />
    {/if}
  </div>

  <div class="status mt-2">
    <StatusControl {status} />
  </div>
</form>

<style lang="scss">
  .separator {
    display: block;
    width: 0.75rem;
    height: 1px;
    background-color: var(--theme-button-border);
    flex-shrink: 0;
  }

  .header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    .description {
      font-size: 1rem;
      color: var(--theme-darker-color);
    }

    .email {
      color: var(--theme-caption-color);
    }
  }

  .status {
    height: 2.375rem;
  }

  .footer {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-height: 4.625rem;
    color: var(--theme-darker-color);
  }

  .container {
    overflow: hidden;
    display: flex;
    flex-direction: column;

    .form {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
      align-items: center;
    }
  }

  .time {
    color: var(--theme-caption-color);
  }
</style>
