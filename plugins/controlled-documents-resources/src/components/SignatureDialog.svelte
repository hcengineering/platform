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
    getResource,
    translate
  } from '@hcengineering/platform'
  import { Button, EditBox, Label, Spinner, StylishEdit, ModernDialog } from '@hcengineering/ui'
  import { getCurrentAccount, SocialIdType } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import contact, { SocialIdentityRef } from '@hcengineering/contact'

  import documents from '../plugin'
  import StatusControl from './requests/StatusControl.svelte'
  import { LoginInfo, loginIntlFieldNames } from '../utils'
  import { SignatureCredentials, verifySignatureCredentials } from '../signature'

  export let confirmationTitle: IntlString = documents.string.ConfirmApproval
  export let rejectionTitle: IntlString = documents.string.ConfirmRejection
  export let isRejection: boolean = false

  const dispatch = createEventDispatcher()
  const account = getCurrentAccount()
  const client = getClient()

  let rejectionNote = ''
  const object: LoginInfo = {
    email: '',
    password: ''
  }

  // Accounts without a password (e.g. SSO-only) confirm their signature with a one-time code sent to their email
  let hasPassword: boolean | undefined = undefined
  let emailLoaded = false
  let code = ''
  let codeSent = false
  let sendingCode = false

  void client
    .findOne(contact.class.SocialIdentity, {
      _id: { $in: account.socialIds as SocialIdentityRef[] },
      type: SocialIdType.EMAIL
    })
    .then((si) => {
      if (si != null) {
        object.email = si.value
      }
    })
    .finally(() => {
      emailLoaded = true
    })

  async function checkPassword (): Promise<void> {
    try {
      const check = await getResource(login.function.CheckHasPassword)
      hasPassword = await check()
    } catch {
      hasPassword = true // fall back to the password confirmation
    }
  }
  void checkPassword()

  const accountsUrl = getMetadata(login.metadata.AccountsUrl) ?? ''
  $: useOtp = hasPassword === false
  $: disableEmailField = object.email !== '' || useOtp
  $: canSubmit =
    hasPassword !== undefined &&
    object.email !== '' &&
    (useOtp ? codeSent && code.trim() !== '' : object.password !== '') &&
    (!isRejection || rejectionNote.trim().length > 0)

  let status = OK

  async function submit (): Promise<void> {
    if (!canSubmit) {
      return
    }

    const credentials: SignatureCredentials = useOtp
      ? { method: 'otp', email: object.email, code: code.trim() }
      : { method: 'password', email: object.email, password: object.password }

    status = await verifySignatureCredentials(getAccountClient(accountsUrl), credentials, account.uuid)

    if (status === OK) {
      dispatch('close', { rejectionNote: isRejection ? rejectionNote : undefined })
    }
  }

  async function sendCode (): Promise<void> {
    if (object.email === '') {
      return
    }

    sendingCode = true
    try {
      await getAccountClient(accountsUrl).loginOtp(object.email)
      codeSent = true
      status = OK
    } catch (err: any) {
      status = err instanceof PlatformError ? err.status : ERROR
    } finally {
      sendingCode = false
    }
  }

  async function validate (): Promise<void> {
    if (useOtp) {
      if (code.trim() === '') {
        status = new Status(Severity.INFO, documents.string.FieldIsEmpty, {
          field: await translate(documents.string.VerificationCode, {})
        })
        return
      }
    } else {
      for (const field of Object.keys(object)) {
        const k = field as keyof LoginInfo
        if (object[k] === '') {
          status = new Status(Severity.INFO, documents.string.FieldIsEmpty, {
            field: await translate(loginIntlFieldNames[k], {})
          })
          return
        }
      }
    }

    if (isRejection && rejectionNote.trim().length === 0) {
      status = new Status(Severity.INFO, documents.string.FieldIsEmpty, {
        field: await translate(documents.string.RejectionReason, {})
      })
      return
    }

    status = OK
  }
</script>

<ModernDialog
  label={isRejection ? rejectionTitle : confirmationTitle}
  {canSubmit}
  on:submit={submit}
  on:close
  width="32rem"
  shadow={true}
  className={'signature-dialog'}
>
  <div class="flex-col flex-gap-2">
    <StylishEdit
      label={documents.string.Email}
      name={documents.string.Email}
      password={false}
      bind:value={object.email}
      on:input={validate}
      on:blur={() => object.email.trim()}
      disabled={disableEmailField}
    />
    {#if hasPassword === undefined}
      <Spinner size={'small'} />
    {:else if useOtp}
      {#if emailLoaded && object.email === ''}
        <div class="signature-hint">
          <Label label={documents.string.SignatureNoEmail} />
        </div>
      {:else}
        <div class="signature-hint">
          <Label label={codeSent ? documents.string.SignatureOtpSent : documents.string.SignatureOtpHint} />
        </div>
        <div class="flex-row-center flex-gap-2">
          <div class="flex-grow">
            <StylishEdit
              label={documents.string.VerificationCode}
              name={documents.string.VerificationCode}
              password={false}
              bind:value={code}
              on:input={validate}
              disabled={!codeSent}
            />
          </div>
          <Button
            label={documents.string.SendVerificationCode}
            kind={'regular'}
            disabled={sendingCode || object.email === ''}
            on:click={sendCode}
          />
        </div>
      {/if}
    {:else}
      <StylishEdit
        label={documents.string.Password}
        name={documents.string.Password}
        password={true}
        bind:value={object.password}
        on:input={validate}
        on:blur={() => object.email.trim()}
      />
    {/if}
    {#if isRejection}
      <div class="mt-2">
        <EditBox
          id="rejection-reason"
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
