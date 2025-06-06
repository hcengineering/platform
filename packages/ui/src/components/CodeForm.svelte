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
  import { createEventDispatcher, onDestroy } from 'svelte'

  import CodeInput from './CodeInput.svelte'

  export let fields: { id: string, name: string, optional: boolean }[] = []
  export let size: 'small' | 'medium' = 'small'
  export let kind: 'primary' | 'secondary' = 'primary'
  export let padding: string | null = null
  export let minHeight: string | null = null

  const dispatch = createEventDispatcher()
  const formData: Record<string, string> = Object.fromEntries(fields.map(({ name }) => [name, '']))

  let formElement: HTMLFormElement | undefined

  function trim (field: string): void {
    formData[field] = formData[field].trim()
  }

  async function validateCode (): Promise<void> {
    const code = Object.values(formData).join('')

    dispatch('submit', code)
  }

  function onInput (e: Event): void {
    if (e.target == null) return
    const target = e.target as HTMLInputElement
    const { value } = target
    if (value == null || value === '') return
    const index = fields.findIndex(({ id }) => id === target.id)
    if (index === -1) return
    if (Object.values(formData).every((v) => v !== '')) {
      void validateCode()
      return
    }
    const nextField = fields[index + 1]
    if (nextField === undefined) return
    const nextInput = formElement?.querySelector(`input[name="${nextField.name}"]`) as HTMLInputElement
    if (nextInput != null) {
      nextInput.focus()
    }
  }

  function onKeydown (e: KeyboardEvent): void {
    if (e.key === undefined) {
      return
    }
    const key = e.key.toLowerCase()
    const target = e.target as HTMLInputElement
    if (key !== 'backspace' && key !== 'delete') return
    const index = fields.findIndex(({ id }) => id === target.id)
    if (index === -1) return
    const { value } = target
    target.value = ''
    formData[fields[index].name] = ''
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
    const digits = text.split('').filter((it) => it !== ' ')
    if (digits.length !== fields.length) return
    let focusName: string | undefined = undefined
    for (const field of fields) {
      const digit = digits.shift()
      if (digit === undefined) break
      formData[field.name] = digit
      focusName = field.name
    }
    if (focusName !== undefined && focusName !== '' && formElement) {
      const input = formElement.querySelector(`input[name="${focusName}"]`) as HTMLInputElement | undefined
      input?.focus()
    }
    if (Object.values(formData).every((v) => v !== '')) {
      void validateCode()
    }
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
</script>

<form bind:this={formElement} class="container" style:padding style:min-height={minHeight}>
  <div class="form">
    {#each fields as field, index (field.name)}
      {#if index === fields.length / 2}
        <div class="separator" />
      {/if}
      <div class={'form-row'}>
        <CodeInput
          id={field.id}
          name={field.name}
          {size}
          {kind}
          bind:value={formData[field.name]}
          on:blur={() => {
            trim(field.name)
          }}
        />
      </div>
    {/each}
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
</style>
