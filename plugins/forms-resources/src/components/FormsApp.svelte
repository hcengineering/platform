<!--
//
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
  import { formsId, isFormInputField, type FormSchema, type FormSubmissionResult } from '@hcengineering/forms'
  import { getMetadata } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'
  import { concatLink, generateId } from '@hcengineering/core'
  import { getAccount } from '@hcengineering/login-resources'
  import { Button, Label, Loading, Popup, TraceXLogo, location, getCurrentLocation, type Location } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import FormFieldInput from './FormFieldInput.svelte'
  import FormIdentity from './FormIdentity.svelte'
  import forms from '../plugin'

  interface Identity {
    name: string
    token: string
  }
  interface Draft {
    fields: Record<string, unknown>
    requestId: string
  }

  let schema: FormSchema | undefined
  let identity: Identity | undefined
  let loading = true
  let unavailable = false
  let authenticationRequired = false
  let accessDenied = false
  let submitting = false
  let failed = false
  let fields: Record<string, unknown> = {}
  let invalid: Record<string, boolean> = {}
  let result: FormSubmissionResult | undefined
  let workspace = ''
  let formId = ''
  let draftKey = ''
  let requestId = ''
  let lastPath = ''
  let controller: AbortController | undefined

  const front = getMetadata(presentation.metadata.FrontUrl) || window.location.origin
  const endpoint = concatLink(front, 'api/forms')

  function saveDraft (): void {
    if (draftKey === '' || result !== undefined) return
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ fields, requestId }))
    } catch {
      // Forms remain usable when browser storage is unavailable.
    }
  }

  function restoreDraft (): void {
    fields = {}
    requestId = generateId()
    try {
      const stored = sessionStorage.getItem(draftKey)
      if (stored === null) return
      const draft = JSON.parse(stored) as Draft
      if (typeof draft.fields === 'object' && draft.fields !== null && typeof draft.requestId === 'string') {
        fields = draft.fields
        requestId = draft.requestId
      }
    } catch {
      // Invalid drafts are ignored.
    }
  }

  async function load (loc: Location, verifiedToken?: string): Promise<void> {
    if (loc.path[0] !== formsId || (loc.path.join('/') === lastPath && verifiedToken === undefined)) return
    lastPath = loc.path.join('/')
    controller?.abort()
    const abort = new AbortController()
    controller = abort
    workspace = loc.path[1] ?? ''
    formId = loc.path[2] ?? ''
    draftKey = `forms:draft:${workspace}:${formId}`
    loading = true
    unavailable = false
    authenticationRequired = false
    accessDenied = false
    failed = false
    result = undefined
    schema = undefined
    identity = undefined
    invalid = {}
    try {
      restoreDraft()
      if (workspace === '' || formId === '') throw new Error('Workspace and form ID are required')
      const url = `${endpoint}/${encodeURIComponent(workspace)}/${encodeURIComponent(formId)}`
      const token = verifiedToken ?? (await getAccount(false))?.token
      const response = await fetch(url, {
        signal: abort.signal,
        headers: token === undefined ? {} : { Authorization: `Bearer ${token}` }
      })
      if (abort.signal.aborted) return
      if (response.status === 401) {
        authenticationRequired = true
        return
      }
      if (response.status === 403) {
        accessDenied = true
        return
      }
      if (!response.ok) throw new Error('Form unavailable')
      const loadedSchema: FormSchema = await response.json()
      const inputFields = loadedSchema.fields.filter(isFormInputField)
      schema = {
        ...loadedSchema,
        fields: [
          ...inputFields.filter((field) => field.name === 'title'),
          ...inputFields.filter((field) => field.name !== 'title')
        ]
      }
      const allowed = new Set(schema.fields.map((field) => field.name))
      fields = Object.fromEntries(Object.entries(fields).filter(([name]) => allowed.has(name)))
      if (token !== undefined) {
        const user = await fetch(`${endpoint}/identity`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: abort.signal
        })
        if (user.ok) {
          const data: { name: string } = await user.json()
          identity = { name: data.name, token }
        }
      }
    } catch (error) {
      if (!abort.signal.aborted) unavailable = true
    } finally {
      if (!abort.signal.aborted) loading = false
    }
  }

  onDestroy(
    location.subscribe((loc) => {
      void load(loc)
    })
  )
  onDestroy(() => {
    controller?.abort()
    saveDraft()
  })

  function updateField (name: string, event: CustomEvent<{ value: unknown, valid: boolean }>): void {
    fields = { ...fields, [name]: event.detail.value }
    invalid = { ...invalid, [name]: !event.detail.valid }
    saveDraft()
  }

  async function submit (): Promise<void> {
    if (identity === undefined || schema === undefined || submitting) return
    submitting = true
    failed = false
    try {
      const response = await fetch(`${endpoint}/${encodeURIComponent(workspace)}/${encodeURIComponent(formId)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${identity.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields, requestId })
      })
      if (response.status === 401) {
        identity = undefined
        if (schema.mode !== 'public') authenticationRequired = true
        return
      }
      if (response.status === 403) {
        accessDenied = true
        return
      }
      if (!response.ok) throw new Error('Submission failed')
      result = await response.json()
      try {
        sessionStorage.removeItem(draftKey)
      } catch {
        // A completed submission does not depend on browser storage.
      }
    } catch (error) {
      failed = true
    } finally {
      submitting = false
    }
  }

  $: missing =
    schema?.fields.some(
      (field) =>
        field.required &&
        field.defaultValue === undefined &&
        (fields[field.name] === undefined ||
          fields[field.name] === null ||
          (typeof fields[field.name] === 'string' && String(fields[field.name]).trim() === ''))
    ) ?? false
  $: disabled = submitting || missing || Object.values(invalid).some(Boolean)
</script>

<div class="forms-app">
  <main>
    <div class="brand"><TraceXLogo /><span><Label label={forms.string.Forms} /></span></div>
    {#if loading}<Loading />
    {:else if unavailable}<p role="alert"><Label label={forms.string.Unavailable} /></p>
    {:else if accessDenied}<p role="alert"><Label label={forms.string.AccessDenied} /></p>
    {:else if authenticationRequired}
      <FormIdentity
        {endpoint} {workspace} {formId} privateForm
        on:verified={(event) => { void load(getCurrentLocation(), event.detail.token) }}
        on:redirect={saveDraft}
      />
    {:else if result !== undefined}
      <h1><Label label={forms.string.Submitted} /></h1>
      <a href={new URL(result.url, front).toString()}><Label label={forms.string.OpenCard} /></a>
    {:else if schema !== undefined}
      <h1><Label label={schema.label} /></h1>
      {#if schema.description}<p class="description">{schema.description}</p>{/if}
      <div class="form-content">
        {#if identity !== undefined}
          <p class="author"><Label label={forms.string.SubmittingAs} params={{ name: identity.name }} /></p>
        {:else}
          <FormIdentity
            {endpoint}
            {workspace}
            {formId}
            disabled={submitting}
            on:verified={(event) => {
              identity = event.detail
            }}
            on:redirect={saveDraft}
          />
        {/if}
        <form on:submit|preventDefault={submit}>
          {#each schema.fields as field (field.name)}
            <FormFieldInput
              {field}
              value={fields[field.name]}
              disabled={submitting}
              on:change={(event) => updateField(field.name, event)}
            />
          {/each}
          {#if identity !== undefined}
            <Button label={forms.string.Submit} kind="primary" {disabled} on:click={submit} />
          {/if}
          {#if failed}<p role="alert"><Label label={forms.string.Failed} /></p>{/if}
        </form>
      </div>
    {/if}
  </main>
</div>

<Popup />

<style lang="scss">
  .forms-app {
    overflow: auto;
    width: 100%;
    height: 100%;
    padding: var(--spacing-3);
    background: var(--theme-bg-color);
  }
  main {
    max-width: 42rem;
    margin: 2rem auto;
    padding: var(--spacing-3);
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--large-BorderRadius);
    background: var(--theme-surface-color);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }
  h1 {
    margin: var(--spacing-3) 0 var(--spacing-2);
    font-size: 1.75rem;
  }
  .form-content,
  form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
  .author {
    margin: 0;
    color: var(--global-secondary-TextColor);
  }
  .description {
    white-space: pre-wrap;
    color: var(--theme-caption-color);
  }
  a {
    color: var(--theme-accent-color);
    overflow-wrap: anywhere;
  }
  @media (max-width: 600px) {
    .forms-app {
      padding: var(--spacing-1);
    }
    main {
      margin: 0;
      padding: var(--spacing-2);
    }
  }
</style>
