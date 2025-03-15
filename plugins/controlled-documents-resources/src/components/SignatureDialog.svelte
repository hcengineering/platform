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
    translate
  } from '@hcengineering/platform'
  import { EditBox, StylishEdit, ModernDialog } from '@hcengineering/ui'
  import { getCurrentAccount, SocialIdType } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import contact, { SocialIdentityRef } from '@hcengineering/contact'

  import documents from '../plugin'
  import StatusControl from './requests/StatusControl.svelte'
  import { LoginInfo, loginIntlFieldNames } from '../utils'

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

  const accountsUrl = getMetadata(login.metadata.AccountsUrl) ?? ''
  $: disableEmailField = object.email !== ''
  $: canSubmit = object.email !== '' && object.password !== '' && (!isRejection || rejectionNote.trim().length > 0)

  let status = OK

  async function submit (): Promise<void> {
    if (object.email === '' || object.password === '') {
      return
    }

    status = await validateAccount(object.email, object.password)

    if (status === OK) {
      dispatch('close', { rejectionNote: isRejection ? rejectionNote : undefined })
    }
  }

  async function validateAccount (email: string, password: string): Promise<Status> {
    const accountClient = getAccountClient(accountsUrl)

    try {
      await accountClient.login(email, password)

      return OK
    } catch (err: any) {
      if (err instanceof PlatformError) {
        return err.status
      } else {
        return ERROR
      }
    }
  }

  async function validate (): Promise<void> {
    for (const field of Object.keys(object)) {
      const k = field as keyof LoginInfo
      if (object[k] === '') {
        status = new Status(Severity.INFO, documents.string.FieldIsEmpty, {
          field: await translate(loginIntlFieldNames[k], {})
        })
        return
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
    <StylishEdit
      label={documents.string.Password}
      name={documents.string.Password}
      password={true}
      bind:value={object.password}
      on:input={validate}
      on:blur={() => object.email.trim()}
    />
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
