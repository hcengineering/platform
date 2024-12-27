<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022, 2023 Hardcore Engineering Inc.
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
  import type { IntlString } from '@hcengineering/platform'
  import { OK, Severity, Status, translate } from '@hcengineering/platform'
  import { Button, Label, StylishEdit, deviceOptionsStore as deviceInfo, themeStore } from '@hcengineering/ui'
  import StatusControl from './StatusControl.svelte'

  import { onMount } from 'svelte'
  import { BottomAction } from '..'
  import { makeSequential } from '../mutex'
  import login from '../plugin'
  import BottomActionComponent from './BottomAction.svelte'
  import Providers from './Providers.svelte'
  import Tabs from './Tabs.svelte'

  interface Field {
    id?: string
    name: string
    i18n: IntlString
    password?: boolean
    optional?: boolean
    short?: boolean
    rules?: {
      rule: RegExp
      notMatch: boolean
      ruleDescr: IntlString
    }[]
  }

  interface Action {
    i18n: IntlString
    func: () => Promise<void>
  }

  export let caption: IntlString
  export let status: Status
  export let fields: Field[]
  export let action: Action
  export let secondaryButtonLabel: IntlString | undefined = undefined
  export let secondaryButtonAction: (() => void) | undefined = undefined
  export let bottomActions: BottomAction[] = []
  export let object: any
  export let ignoreInitialValidation: boolean = false
  export let withProviders: boolean = false
  export let subtitle: string | undefined = undefined
  export let signUpDisabled = false

  const validate = makeSequential(async function validateAsync (language: string): Promise<boolean> {
    if (ignoreInitialValidation) return true
    for (const field of fields) {
      const v = object[field.name]
      const f = field
      if (!f.optional && (!v || v.trim() === '')) {
        status = new Status(Severity.INFO, login.status.RequiredField, {
          field: await translate(field.i18n, {}, language)
        })
        return false
      }
      if (f.id !== undefined) {
        const sameFields = fields.filter((f) => f.id === field.id)
        for (const field of sameFields) {
          const v = object[field.name]
          if (v !== object[f.name]) {
            status = new Status(Severity.INFO, login.status.FieldsDoNotMatch, {
              field: await translate(field.i18n, {}, language),
              field2: await translate(f.i18n, {}, language)
            })
            return false
          }
        }
      }
      if (f.rules !== undefined) {
        for (const rule of f.rules) {
          if (rule.rule.test(v) === rule.notMatch) {
            status = new Status(Severity.INFO, rule.ruleDescr, {})
            return false
          }
        }
      }
    }
    status = OK
    return true
  })

  $: if ($themeStore.language != null && $themeStore.language !== '') {
    void validate($themeStore.language)
  }

  let inAction = false

  function performAction (action: Action): void {
    for (const field of fields) {
      trim(field.name)
    }
    inAction = true
    void action.func().finally(() => {
      inAction = false
    })
  }
  onMount(() => (ignoreInitialValidation = false))

  function trim (field: string): void {
    object[field] = (object[field] as string).trim()
  }

  let loginState: 'login' | 'signup' | 'none' = 'none'
  $: loginState = caption === login.string.LogIn ? 'login' : caption === login.string.SignUp ? 'signup' : 'none'
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<form
  class="container"
  style:padding={$deviceInfo.docWidth <= 480 ? '.25rem 1.25rem' : '4rem 5rem'}
  style:min-height={$deviceInfo.docHeight > 720 ? '42rem' : '0'}
  on:keydown={(evt) => {
    if (evt.key === 'Enter') {
      evt.preventDefault()
      evt.stopPropagation()
      if (!inAction) {
        void validate($themeStore.language).then((res) => {
          if (res != null) {
            performAction(action)
          }
        })
      }
    }
  }}
>
  {#if loginState !== 'none'}
    <Tabs {loginState} {signUpDisabled} />
  {:else}
    {#if subtitle !== undefined}
      <div class="fs-title">
        {subtitle}
      </div>
    {/if}
    <div class="flex-row-center">
      <div class="title"><Label label={caption} /></div>
      <slot name="region-selector" />
    </div>
  {/if}
  <div class="form">
    {#each fields as field (field.name)}
      <div class={field.short !== undefined && !($deviceInfo.docWidth <= 600) ? 'form-col' : 'form-row'}>
        <StylishEdit
          label={field.i18n}
          name={field.id}
          password={field.password}
          bind:value={object[field.name]}
          on:input={() => validate($themeStore.language)}
          on:blur={() => {
            trim(field.name)
          }}
        />
      </div>
    {/each}

    <div class="status">
      <StatusControl {status} />
    </div>

    <div class="form-row send">
      <Button
        label={action.i18n}
        kind={'contrast'}
        shape={'round2'}
        size={'x-large'}
        width="100%"
        loading={inAction}
        disabled={status.severity !== Severity.OK && status.severity !== Severity.ERROR}
        on:click={(e) => {
          e.preventDefault()
          performAction(action)
        }}
      />
    </div>
    {#if secondaryButtonLabel !== undefined && secondaryButtonAction}
      <div class="form-row">
        <Button
          label={secondaryButtonLabel}
          width="100%"
          on:click={(e) => {
            e.preventDefault()
            secondaryButtonAction?.()
          }}
        />
      </div>
    {/if}
  </div>
  {#if withProviders}
    <Providers />
  {/if}
  {#if bottomActions.length}
    <div class="footer">
      {#each bottomActions as action}
        <BottomActionComponent {action} />
      {/each}
    </div>
  {/if}
</form>

<style lang="scss">
  .container {
    overflow: hidden;
    display: flex;
    flex-direction: column;

    .title {
      font-weight: 500;
      font-size: 1.25rem;
      color: var(--theme-caption-color);
    }
    .status {
      padding-top: 1rem;
      grid-column-start: 1;
      grid-column-end: 3;
    }

    .form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 0.75rem;
      row-gap: 1.5rem;
      margin-top: 1.5rem;

      .form-row {
        grid-column-start: 1;
        grid-column-end: 3;
      }

      .hint {
        margin-top: 1rem;
        font-size: 0.8rem;
        color: var(--theme-content-color);
      }

      .send {
        margin-top: 0rem;
      }
    }
    .grow-separator {
      flex-grow: 1;
    }
    .footer {
      margin-top: 1.75rem;
      font-size: 0.8rem;
      color: var(--theme-content-color);
      span {
        color: var(--theme-darker-color);
      }
      a {
        font-weight: 500;
        text-decoration: underline;
        color: var(--theme-content-color);
      }
    }
  }
</style>
