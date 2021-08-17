<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import { StylishEdit, Label, Button, StatusControl } from '@anticrm/ui'
  import { OK, Status, Severity } from '@anticrm/platform'
  import type { IntlString } from '@anticrm/platform'
  import { translate } from '@anticrm/platform'

  import login from '../plugin'

  interface Field {
    name: string
    i18n: IntlString
    password?: boolean
    optional?: boolean
    short?: boolean
  }

  interface Action {
    i18n: IntlString
    func: () => Promise<void>
  }

  export let caption: IntlString
  export let status: Status
  export let fields: Field[]
  export let action: Action
  export let bottomCaption: IntlString
  export let bottomActionLabel: IntlString
  export let bottomActionFunc: () => void
  export let object: any

  async function validate () {
    for (const field of fields) {
      const v = object[field.name]
      const f = field
      if (!f.optional && (!v || v === '')) {
        status = new Status(Severity.INFO, login.status.RequiredField, {field: await translate(field.i18n, {})})
        return
      }
    }
    status = OK
  }
  validate()

  let inAction = false

  function performAction(action: Action) {
    inAction = true
    action.func().finally(() => {inAction = false})
  }

</script>

<form class="container">
  <div class="grow-separator"/>
  <div class="title"><Label label={caption}/></div>
  <div class="status">
    <StatusControl {status} width="100%"/>
  </div>
  <div class="form">

    {#each fields as field (field.name)}
    <div class={field.short ? 'form-col' : 'form-row'}>
      <StylishEdit label={field.i18n} password={field.password} bind:value={object[field.name]} on:keyup={validate} on:focus={validate} />
    </div>
    {/each}

    <div class="form-row send">
      <Button label={action.i18n} primary width="100%" loading={inAction} 
        disabled={status.severity !== Severity.OK && status.severity !== Severity.ERROR} 
        on:click={() => {performAction(action)}}/>
    </div>

    <!-- <div class="form-col"><EditBox label="First Name" bind:value={fname}/></div>
    <div class="form-col"><EditBox label="Last Name" bind:value={lname}/></div>
    <div class="form-row"><EditBox label="E-mail"/></div>
    <div class="form-row"><EditBox label="Password" password/></div>
    <div class="form-row"><EditBox label="Repeat password" password/></div> -->

  </div>
  <div class="grow-separator"/>
  <div class="footer">
    <span><Label label={bottomCaption}/></span>
    <a href="." on:click|preventDefault={bottomActionFunc}><Label label={bottomActionLabel}/></a>
  </div>
</form>

  <!-- <div class="actions">
    {#each actions as action, i}
      <button class="button" class:separator={i !== 0} on:click|preventDefault={action.func}> {action.i18n} </button>
    {/each}
  </div> -->

<style lang="scss">
  .container {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    height: 100%;
    padding: 5rem;

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
      column-gap: .75rem;
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
      font-size: .8rem;
      color: var(--theme-caption-color);
      span {
        opacity: .3;
      }
      a {
        text-decoration: none;
        color: var(--theme-caption-color);
        opacity: .8;
        &:hover { opacity: 1; }
      }
    }
  }

</style>
