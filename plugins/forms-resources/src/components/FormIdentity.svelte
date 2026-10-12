<!--
// Copyright © 2026 TraceX SAS.
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
  import { concatLink } from '@hcengineering/core'
  import { formsId } from '@hcengineering/forms'
  import login from '@hcengineering/login'
  import { getAccountClient, getProviders } from '@hcengineering/login-resources'
  import { getMetadata } from '@hcengineering/platform'
  import { Button, CodeForm, EditBox, Label, Loading } from '@hcengineering/ui'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import { requestFormEmailCode } from '../form-auth'
  import forms from '../plugin'

  export let endpoint: string
  export let workspace: string
  export let formId: string
  export let disabled = false
  export let privateForm = false

  const dispatch = createEventDispatcher<{ verified: { name: string, token: string }, redirect: void }>()
  let email = ''
  let code = ''
  let stage: 'email' | 'code' | 'tfa' = 'email'
  let busy = false
  let failed = false
  let hasGoogle = false
  let tfaToken: string | undefined
  let cooldown = false
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let codeForm: CodeForm | undefined
  const codeFields = Array.from({ length: 6 }, (_, index) => ({
    id: `form-author-code-${index + 1}`,
    name: `form-author-code-${index + 1}`,
    optional: false
  }))

  onMount(() => {
    let mounted = true
    void getProviders()
      .then((providers) => {
        if (mounted) hasGoogle = providers.some((provider) => provider.name === 'google')
      })
      .catch(() => {
        // Email verification remains available when provider discovery fails.
      })
    return () => {
      mounted = false
    }
  })
  onDestroy(() => {
    clearTimeout(retryTimer)
  })

  function isValidEmail (value: string): boolean {
    const address = value.trim()
    const parts = address.split('@')
    if (parts.length !== 2 || parts[0] === '' || /\s/.test(address)) return false
    const domain = parts[1]
    const dot = domain.lastIndexOf('.')
    return dot > 0 && dot < domain.length - 1
  }

  $: validEmail = isValidEmail(email)

  async function sendCode (): Promise<void> {
    if (busy || disabled || !validEmail || cooldown) return
    busy = true
    failed = false
    try {
      email = email.trim().toLowerCase()
      const info = await requestFormEmailCode(getAccountClient(null), email)
      stage = 'code'
      code = ''
      codeForm?.clear()
      cooldown = true
      clearTimeout(retryTimer)
      retryTimer = setTimeout(
        () => {
          cooldown = false
        },
        Math.max(0, info.retryOn - Date.now())
      )
    } catch {
      failed = true
    } finally {
      busy = false
    }
  }

  async function confirmCode (): Promise<void> {
    if (busy || disabled || code.trim() === '') return
    busy = true
    failed = false
    try {
      const result =
        stage === 'tfa'
          ? await getAccountClient(tfaToken).verify2fa(code.trim())
          : await getAccountClient(null).validateOtp(email, code.trim())
      if (result.tfaRequired === true && result.token !== undefined) {
        tfaToken = result.token
        stage = 'tfa'
        code = ''
        codeForm?.clear()
        return
      }
      if (result.token === undefined) throw new Error('Verification did not return a token')
      const response = await fetch(`${endpoint}/identity`, {
        headers: { Authorization: `Bearer ${result.token}` }
      })
      if (!response.ok) throw new Error('Form author verification failed')
      const identity: { name: string } = await response.json()
      dispatch('verified', { name: identity.name, token: result.token })
    } catch {
      failed = true
    } finally {
      busy = false
    }
  }

  function google (): void {
    dispatch('redirect')
    const accounts = getMetadata(login.metadata.AccountsUrl) ?? ''
    const target = JSON.stringify({ path: [formsId, workspace, formId] })
    window.location.assign(concatLink(accounts, `auth/google?navigateUrl=${encodeURIComponent(target)}`))
  }
  function enter (event: KeyboardEvent): void {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (stage === 'email') void sendCode()
    else void confirmCode()
  }
</script>

<section class="identity" on:submit|preventDefault>
  <p><Label label={privateForm ? forms.string.PrivateHint : forms.string.EmailHint} /></p>
  {#if stage === 'email'}
    <EditBox
      id="form-author-email"
      label={forms.string.Email}
      bind:value={email}
      disabled={busy || disabled}
      fullSize
      on:keydown={enter}
    />
    <Button
      label={forms.string.SendCode}
      kind="regular"
      disabled={busy || disabled || !validEmail || cooldown}
      loading={busy}
      on:click={sendCode}
    />
  {:else}
    {#if stage === 'code'}<p><Label label={forms.string.CodeSent} params={{ email }} /></p>{/if}
    <fieldset class="code" disabled={busy || disabled}>
      <legend><Label label={stage === 'tfa' ? login.string.TwoFactorCode : forms.string.Code} /></legend>
      <CodeForm
        bind:this={codeForm}
        fields={codeFields}
        on:submit={(event) => {
          code = event.detail
          void confirmCode()
        }}
      />
    </fieldset>
    {#if busy}<div role="status"><Loading size="small" shrink /></div>{/if}
    <div class="actions">
      {#if stage === 'code'}
        <Button
          label={forms.string.SendCode}
          kind="no-border"
          disabled={busy || disabled || cooldown}
          on:click={sendCode}
        />
      {/if}
      <Button
        label={forms.string.ChangeEmail}
        kind="no-border"
        disabled={busy || disabled}
        on:click={() => {
          stage = 'email'
          code = ''
          tfaToken = undefined
          failed = false
        }}
      />
    </div>
  {/if}
  {#if hasGoogle}<Button label={forms.string.ContinueWithGoogle} disabled={busy || disabled} on:click={google} />{/if}
  {#if failed}<p role="alert"><Label label={forms.string.VerificationFailed} /></p>{/if}
</section>

<style lang="scss">
  .identity {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-1);
  }
  .code {
    margin: 0;
    padding: 0;
    border: 0;
    min-width: 0;
  }
  .code legend {
    padding: 0;
    color: var(--global-secondary-TextColor);
  }
  p {
    margin: 0;
    color: var(--global-secondary-TextColor);
  }
</style>
