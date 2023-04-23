<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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
  import { StylishEdit, Label, Button, Scroller, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'
  import StatusControl from './StatusControl.svelte'
  import { OK, Status, Severity } from '@hcengineering/platform'
  import type { IntlString } from '@hcengineering/platform'
  import { translate } from '@hcengineering/platform'

  import login from '../plugin'
  import { onMount } from 'svelte'

  interface Field {
    id?: string
    name: string
    i18n: IntlString
    password?: boolean
    optional?: boolean
    short?: boolean
    rule?: RegExp
    ruleDescr?: IntlString
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

  async function validate () {
    if (ignoreInitialValidation) return
    for (const field of fields) {
      const v = object[field.name]
      const f = field
      if (!f.optional && (!v || v === '')) {
        status = new Status(Severity.INFO, login.status.RequiredField, { field: await translate(field.i18n, {}) })
        return
      }
      if (f.id !== undefined) {
        const sameFields = fields.filter((f) => f.id === field.id)
        for (const field of sameFields) {
          const v = object[field.name]
          if (v !== object[f.name]) {
            status = new Status(Severity.INFO, login.status.FieldsDoNotMatch, {
              field: await translate(field.i18n, {}),
              field2: await translate(f.i18n, {})
            })
            return
          }
        }
      }
      if (f.rule !== undefined) {
        if (!f.rule.test(v)) {
          status = new Status(Severity.INFO, login.status.IncorrectValue, {
            field: await translate(field.i18n, {}),
            descr: field.ruleDescr ? await translate(field.ruleDescr, {}) : ''
          })
          return
        }
      }
    }
    status = OK
  }
  validate()

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
</script>

<form class="container" style:padding={$deviceInfo.docWidth <= 480 ? '1.25rem' : '5rem'}>
  <div class="grow-separator" />
  <div class="title"><Label label={caption} /></div>
  <div class="status">
    <StatusControl {status} />
  </div>
  <Scroller padding={'.125rem 0'}>
    <div class="form">
      {#each fields as field (field.name)}
        <div class={field.short && !($deviceInfo.docWidth <= 600) ? 'form-col' : 'form-row'}>
          <StylishEdit
            label={field.i18n}
            name={field.id}
            password={field.password}
            bind:value={object[field.name]}
            on:input={validate}
            on:blur={() => {
              trim(field.name)
            }}
          />
        </div>
      {/each}

      <div class="form-row send">
        <Button
          label={action.i18n}
          kind={'primary'}
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
  </Scroller>
  {#if bottomActions.length}
    <div class="grow-separator" />
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
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex-grow: 1;
    overflow: hidden;
    // height: 100%;
    // padding: 5rem;

    .title {
      font-weight: 600;
      font-size: 1.5rem;
      color: var(--theme-caption-color);
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
      .send {
        margin-top: 2.25rem;
      }
    }
    .grow-separator {
      flex-grow: 1;
    }
    .footer {
      margin-top: 3.5rem;
      font-size: 0.8rem;
      color: var(--theme-caption-color);
      span {
        opacity: 0.3;
      }
      a {
        text-decoration: none;
        color: var(--theme-caption-color);
        opacity: 0.8;
        &:hover {
          opacity: 1;
        }
      }
    }
  }
</style>
