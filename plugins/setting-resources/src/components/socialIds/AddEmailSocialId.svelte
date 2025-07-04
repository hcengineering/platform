<!--
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
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import contact, { getCurrentEmployee, SocialIdentityProvider, SocialIdentityRef } from '@hcengineering/contact'
  import { EditBox, Label, Button, CodeForm, TimeLeft, Status as StatusControl } from '@hcengineering/ui'
  import { OtpInfo } from '@hcengineering/account-client'
  import { buildSocialIdString, getCurrentAccount, setCurrentAccount, SocialId, Timestamp } from '@hcengineering/core'
  import { OK, PlatformError, Severity, Status, unknownError } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'

  import AddSocialId from './AddSocialId.svelte'
  import setting from '../../plugin'
  import { getAccountClient } from '../../utils'

  export let provider: SocialIdentityProvider
  export let onAdded: (socialId: SocialId) => void | Promise<void>

  let email: string
  let otpInfo: OtpInfo | null = null

  const dispatch = createEventDispatcher()
  const client = getClient()
  const accountClient = getAccountClient()
  const codeFields = [
    { id: 'code-1', name: 'code-1', optional: false },
    { id: 'code-2', name: 'code-2', optional: false },
    { id: 'code-3', name: 'code-3', optional: false },
    { id: 'code-4', name: 'code-4', optional: false },
    { id: 'code-5', name: 'code-5', optional: false },
    { id: 'code-6', name: 'code-6', optional: false }
  ]

  $: canSend = getCleanEmail(email) !== ''

  let status: Status = OK
  let retryOn: Timestamp = 0
  let timer: TimeLeft | undefined
  let codeForm: CodeForm | undefined
  let canResend = false

  function getCleanEmail (value: string | undefined): string {
    return value?.trim().toLowerCase() ?? ''
  }

  async function sendConfirmation (): Promise<void> {
    try {
      status = OK
      otpInfo = await accountClient.addEmailSocialId(getCleanEmail(email))
      retryOn = otpInfo.retryOn
      canResend = false
    } catch (err: any) {
      console.error(err)
      if (err instanceof PlatformError) {
        status = err.status
      } else {
        status = unknownError(err)
      }
    }
  }

  async function handleSendConfirmation (): Promise<void> {
    if (otpInfo != null) return

    await sendConfirmation()
  }

  async function handleResend (): Promise<void> {
    if (codeForm != null) codeForm.clear()
    await sendConfirmation()

    if (timer != null) timer.restart(retryOn)
  }

  async function handleCode (event: CustomEvent): Promise<void> {
    const code = event.detail
    if (code == null) return
    status = OK

    try {
      const newSocialIdLoginInfo = await accountClient.validateOtp(email, code, undefined, 'verify')
      const currPerson = getCurrentEmployee()
      const currAcc = getCurrentAccount()
      const socialIds = await accountClient.getSocialIds()

      const newSocialId = socialIds.find((it) => it._id === newSocialIdLoginInfo.socialId)
      if (newSocialId == null) {
        console.error(`New social id ${newSocialIdLoginInfo.socialId} not found in the updated social ids list`)
        return
      }

      // Create/update new social identity in the workspace
      const existing = await client.findOne(contact.class.SocialIdentity, {
        _id: newSocialIdLoginInfo.socialId as SocialIdentityRef
      })
      if (existing != null) {
        // It can only exist if it were attached to an existing person and now this person was merged into the current account
        if (existing.attachedTo !== currPerson) {
          await client.updateDoc(contact.class.SocialIdentity, contact.space.Contacts, existing._id, {
            attachedTo: currPerson,
            verifiedOn: newSocialId.verifiedOn
          })
        }
      } else {
        await client.addCollection(
          contact.class.SocialIdentity,
          contact.space.Contacts,
          currPerson,
          contact.class.Person,
          'socialIds',
          {
            type: newSocialId.type,
            value: newSocialId.value,
            key: buildSocialIdString(newSocialId), // TODO: fill it in trigger or on DB level as stored calculated column or smth?
            verifiedOn: newSocialId.verifiedOn,
            isDeleted: newSocialId.isDeleted
          },
          newSocialId._id as SocialIdentityRef
        )
      }

      setCurrentAccount({
        ...currAcc,
        fullSocialIds: socialIds,
        socialIds: socialIds.map((si) => si._id)
      })
      if (onAdded != null) {
        console.log('Callback onAdded')
        void onAdded(newSocialId)
      }
      dispatch('close')
    } catch (err: any) {
      console.error(err)
      if (err instanceof PlatformError) {
        status = err.status
      } else {
        status = unknownError(err)
      }
    }
  }
</script>

<AddSocialId {provider} on:close>
  <div class="flex-col flex-gap-2">
    <div class="flex-row-center flex-gap-4">
      <span class="newEmail"><Label label={setting.string.NewEmail} /></span>
      <EditBox
        maxWidth="10rem"
        placeholder={contact.string.Email}
        bind:value={email}
        disabled={otpInfo != null}
        focusIndex={0}
      />

      <div class="flex-row-center">
        {#if otpInfo != null}
          <Label label={setting.string.CodeSent} />
        {/if}

        {#if retryOn > 0 && !canResend}
          <span class="flex-row-top ml-1">
            <Label label={setting.string.SendAgainIn} />
            <span class="ml-1">
              <TimeLeft
                bind:this={timer}
                time={retryOn}
                on:timeout={() => {
                  canResend = true
                }}
              />
            </span>
          </span>
        {/if}

        {#if canResend}
          <div class="ml-1">
            <Button label={setting.string.SendAgain} kind="ghost" size="small" on:click={handleResend} />
          </div>
        {/if}
      </div>
    </div>

    {#if otpInfo != null}
      <CodeForm bind:this={codeForm} fields={codeFields} size="small" on:submit={handleCode} />
    {:else}
      <div class="sendOtp">
        <Button
          label={setting.string.SendConfirmation}
          kind="primary"
          size="small"
          disabled={!canSend}
          on:click={handleSendConfirmation}
        />
      </div>
    {/if}

    {#if status.severity !== Severity.OK}
      <div class="flex-row-center mt-1" class:error={status.severity === Severity.ERROR}>
        <StatusControl {status} overflow={false} />
      </div>
    {/if}
  </div>
</AddSocialId>

<style lang="scss">
  .newEmail {
    width: 6rem;
  }

  .sendOtp {
    margin-top: 1.825rem;
  }
</style>
