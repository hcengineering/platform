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
  import {
    getCurrentLocation,
    navigate,
    StylishEdit,
    Label,
    Button,
    deviceOptionsStore as deviceInfo
  } from '@hcengineering/ui'
  import StatusControl from './StatusControl.svelte'
  import { OK, Status, Severity } from '@hcengineering/platform'
  import type { IntlString } from '@hcengineering/platform'
  import { translate } from '@hcengineering/platform'
  import { themeStore } from '@hcengineering/ui'

  import login from '../plugin'
  import { onMount } from 'svelte'

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

  interface BottomAction {
    i18n: IntlString
    func: () => void
    caption: IntlString
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

  $: $themeStore.language && validate($themeStore.language)

  async function validate (language: string): Promise<boolean> {
    if (ignoreInitialValidation) return true
    for (const field of fields) {
      const v = object[field.name]
      const f = field
      if (!f.optional && (!v || v === '')) {
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
  }
  validate($themeStore.language)

  let inAction = false

  function performAction (action: Action) {
    for (const field of fields) {
      trim(field.name)
    }
    inAction = true
    action.func().finally(() => {
      inAction = false
    })
  }
  onMount(() => (ignoreInitialValidation = false))

  function trim (field: string): void {
    object[field] = (object[field] as string).trim()
  }

  const goTab = (path: string) => {
    const loc = getCurrentLocation()
    loc.path[1] = path
    loc.path.length = 2
    navigate(loc)
  }
  $: loginState = caption === login.string.LogIn ? 'login' : caption === login.string.SignUp ? 'signup' : 'none'
</script>

<form
  class="container"
  style:padding={$deviceInfo.docWidth <= 480 ? '.25rem 1.25rem' : '4rem 5rem'}
  style:min-height={$deviceInfo.docHeight > 720 ? '42rem' : '0'}
  on:keydown={(evt) => {
    if (evt.key === 'Enter' && !inAction) {
      validate($themeStore.language).then((res) => {
        if (res) {
          performAction(action)
        }
      })
    }
  }}
>
  {#if loginState !== 'none'}
    <div class="flex-row-center caption">
      <a
        class="title"
        class:selected={loginState === 'signup'}
        href="."
        on:click|preventDefault={() => {
          if (loginState !== 'signup') goTab('signup')
        }}
      >
        <Label label={login.string.SignUp} />
      </a>
      <a
        class="title"
        class:selected={loginState === 'login'}
        href="."
        on:click|preventDefault={() => {
          if (loginState !== 'login') goTab('login')
        }}
      >
        <Label label={login.string.LogIn} />
      </a>
    </div>
  {:else}
    <div class="title"><Label label={caption} /></div>
  {/if}
  <div class="status">
    <StatusControl {status} />
  </div>
  <div class="form">
    {#each fields as field (field.name)}
      <div class={field.short && !($deviceInfo.docWidth <= 600) ? 'form-col' : 'form-row'}>
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
    {#if secondaryButtonLabel && secondaryButtonAction}
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
  {#if bottomActions.length}
    <div class="footer">
      {#each bottomActions as action}
        <div>
          <span><Label label={action.caption} /></span>
          <a href="." on:click|preventDefault={action.func}><Label label={action.i18n} /></a>
        </div>
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
    .caption a {
      padding-bottom: 0.375rem;
      border-bottom: 2px solid var(--theme-caption-color);

      &:not(.selected) {
        color: var(--theme-dark-color);
        border-bottom-color: transparent;

        &:hover {
          color: var(--theme-caption-color);
        }
      }
      &.selected {
        cursor: default;
      }
      &:first-child {
        margin-right: 1.75rem;
      }
      &:hover {
        text-decoration: none;
      }
    }
    .status {
      min-height: 7.5rem;
      max-height: 7.5rem;
      padding-top: 1.25rem;
    }

    .form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 0.75rem;
      row-gap: 1.5rem;

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
        margin-top: 2.25rem;
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
