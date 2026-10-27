<!--
//
// Copyright © 2023 Hardcore Engineering Inc.
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
//
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { Analytics } from '@hcengineering/analytics'
  import login from '@hcengineering/login'
  import { getClient as getAccountClient } from '@hcengineering/account-client'
  import {
    ERROR,
    IntlString,
    OK,
    PlatformError,
    Severity,
    Status,
    getMetadata,
    translate
  } from '@hcengineering/platform'
  import { Button, EditBox, Label, Spinner, StylishEdit, ModernDialog, TimeLeft } from '@hcengineering/ui'
  import { generateId, getCurrentAccount } from '@hcengineering/core'
  import presentation from '@hcengineering/presentation'

  import documents from '../plugin'
  import StatusControl from './requests/StatusControl.svelte'
  import { LoginInfo, loginIntlFieldNames } from '../utils'
  import {
    SignatureConfirmation,
    SignatureCredentials,
    loadSignatureConfirmation,
    SignatureRequests
  } from '../signature'

  export let confirmationTitle: IntlString = documents.string.ConfirmApproval
  export let rejectionTitle: IntlString = documents.string.ConfirmRejection
  export let isRejection: boolean = false

  const dispatch = createEventDispatcher()
  const account = getCurrentAccount()
  const accountsUrl = getMetadata(login.metadata.AccountsUrl) ?? ''
  const accountClient = getAccountClient(accountsUrl, getMetadata(presentation.metadata.Token))
  const labelPrefix = generateId()

  let rejectionNote = ''
  const object: LoginInfo = {
    email: '',
    password: ''
  }

  // Accounts without a password (e.g. SSO-only) confirm their signature with a one-time code sent to their email
  let confirmation: SignatureConfirmation | undefined
  let loading = true
  let code = ''
  let canResend = true
  let status = OK
  let validationRequest = 0
  let requests = new SignatureRequests(accountClient, account.uuid, (state) => {
    validationRequest++
    requests = state
    status = requests.status
    canResend = requests.retryOn <= Date.now()
  })

  async function loadConfirmation (): Promise<void> {
    try {
      confirmation = await loadSignatureConfirmation(accountClient, account.uuid)
      object.email = confirmation.email
    } catch (err: any) {
      Analytics.handleError(err)
      status = err instanceof PlatformError ? err.status : ERROR
    } finally {
      loading = false
    }
  }
  void loadConfirmation()

  $: useOtp = confirmation?.method === 'otp'
  $: canEditEmail = confirmation?.method === 'password' && confirmation.email === ''
  $: canSubmit =
    requests.pending === undefined &&
    confirmation !== undefined &&
    object.email !== '' &&
    (useOtp ? requests.codeRequested && code.trim() !== '' : object.password !== '') &&
    (!isRejection || rejectionNote.trim().length > 0)

  async function submit (): Promise<void> {
    if (requests.pending !== undefined || !canSubmit) {
      return
    }

    const credentials: SignatureCredentials = useOtp
      ? { method: 'otp', email: confirmation?.email ?? '', code: code.trim() }
      : { method: 'password', email: object.email, password: object.password }

    if (await requests.verify(credentials)) {
      dispatch('close', { rejectionNote: isRejection ? rejectionNote : undefined })
    }
  }

  async function sendCode (): Promise<void> {
    if (!useOtp || !canResend || confirmation?.email === undefined) return
    await requests.sendCode(confirmation.email)
  }

  async function validate (): Promise<void> {
    const request = ++validationRequest
    if (requests.pending !== undefined) return
    if (useOtp) {
      if (code.trim() === '') {
        const field = await translate(documents.string.VerificationCode, {})
        if (request === validationRequest) {
          status = new Status(Severity.INFO, documents.string.FieldIsEmpty, { field })
        }
        return
      }
    } else {
      for (const field of Object.keys(object)) {
        const k = field as keyof LoginInfo
        if (object[k] === '') {
          const field = await translate(loginIntlFieldNames[k], {})
          if (request === validationRequest) {
            status = new Status(Severity.INFO, documents.string.FieldIsEmpty, { field })
          }
          return
        }
      }
    }

    if (isRejection && rejectionNote.trim().length === 0) {
      const field = await translate(documents.string.RejectionReason, {})
      if (request === validationRequest) {
        status = new Status(Severity.INFO, documents.string.FieldIsEmpty, { field })
      }
      return
    }

    status = OK
  }
</script>

<ModernDialog
  label={isRejection ? rejectionTitle : confirmationTitle}
  {canSubmit}
  loading={requests.pending !== undefined}
  on:submit={submit}
  on:close
  width="32rem"
  shadow={true}
  className={'signature-dialog'}
>
  <div class="flex-col flex-gap-2">
    <StylishEdit
      label={documents.string.Email}
      labelId={`${labelPrefix}-email-label`}
      name={documents.string.Email}
      password={false}
      bind:value={object.email}
      disabled={!canEditEmail || requests.pending !== undefined}
      on:input={validate}
    />
    {#if loading}
      <Spinner size={'small'} />
    {:else if useOtp && object.email === ''}
      <div class="signature-hint">
        <Label label={documents.string.SignatureNoEmail} />
      </div>
    {:else if useOtp}
      <div class="signature-hint">
        <Label label={requests.codeRequested ? documents.string.SignatureOtpSent : documents.string.SignatureOtpHint} />
      </div>
      <div class="flex-row-center flex-gap-2">
        <div class="flex-grow">
          <StylishEdit
            label={documents.string.VerificationCode}
            labelId={`${labelPrefix}-code-label`}
            name={documents.string.VerificationCode}
            password={false}
            bind:value={code}
            on:input={validate}
            disabled={!requests.codeRequested || requests.pending !== undefined}
          />
        </div>
        <Button
          label={documents.string.SendVerificationCode}
          kind={'regular'}
          disabled={requests.pending !== undefined || !canResend || object.email === ''}
          on:click={sendCode}
        />
      </div>
      {#if requests.retryOn > 0 && !canResend}
        <div class="signature-hint" role="status">
          <Label label={documents.string.ResendCodeIn} />
          <TimeLeft
            time={requests.retryOn}
            on:timeout={() => {
              canResend = true
            }}
          />
        </div>
      {/if}
    {:else if confirmation?.method === 'password'}
      <StylishEdit
        label={documents.string.Password}
        labelId={`${labelPrefix}-password-label`}
        disabled={requests.pending !== undefined}
        name={documents.string.Password}
        password={true}
        bind:value={object.password}
        on:input={validate}
      />
    {/if}
    {#if isRejection}
      <div class="mt-2">
        <EditBox
          id="rejection-reason"
          disabled={requests.pending !== undefined}
          label={documents.string.RejectionReason}
          value={rejectionNote}
          placeholder={documents.string.ProvideRejectionReason}
          kind="default"
          required={true}
          on:value={({ detail }) => {
            rejectionNote = detail
            void validate()
          }}
        />
      </div>
    {/if}
  </div>

  <div slot="footerExtra">
    <StatusControl {status} />
  </div>
</ModernDialog>

<style lang="scss">
  .signature-hint {
    font-size: 0.8125rem;
    color: var(--theme-dark-color);
    line-height: 1.5;
  }
</style>
