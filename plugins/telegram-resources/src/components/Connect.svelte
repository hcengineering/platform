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
  import { IntlString } from '@hcengineering/platform'
  import ui, { Button, EditBox, IconClose, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import PinPad from './PinPad.svelte'
  import telegram from '../plugin'
  import { command, list, type Integration } from '../api'
  import ChannelsConfig from './config/ChannelsConfig.svelte'

  let phone: string = ''
  let code: string = ''
  let password: string = ''
  let error: string = ''

  const dispatch = createEventDispatcher()

  function close (): void {
    dispatch('close')
  }

  interface UIState {
    mode: 'Loading' | 'WantPhone' | 'WantCode' | 'WantPassword' | 'Authorized' | 'Configured' | 'Unauthorized' | 'Error'
    hint?: string

    buttons?: {
      primary?: { label: IntlString, handler?: () => any, disabled?: boolean }
      secondary?: { label: IntlString, handler?: () => any }
    }
  }

  let integration: Integration = 'Loading'
  let state: UIState = { mode: 'Loading' }

  function h (handler: () => Promise<Integration>) {
    return () => {
      handler()
        .then((i) => {
          integration = i
        })
        .catch((error) => {
          state = {
            mode: 'Error',
            hint: error.message,
            buttons: {
              primary: { label: ui.string.Ok, handler: close }
            }
          }
        })
    }
  }

  $: {
    if (integration === 'Loading') {
      state = { mode: 'Loading' }
    } else if (integration === 'Missing') {
      state = {
        mode: 'WantPhone',
        buttons: {
          primary: {
            label: ui.string.Next,
            handler: h(() => command(phone, 'start')),
            disabled: phone.match(/^\+\d{9,15}$/) == null
          },
          secondary: { label: telegram.string.Cancel, handler: close }
        }
      }
    } else {
      switch (integration.status) {
        case 'authorized': {
          state = {
            mode: 'Authorized',
            hint: integration.number,
            buttons: {
              primary: { label: ui.string.Ok, handler: close }
              // secondary: { label: telegram.string.Disconnect }
            }
          }
          break
        }

        case 'wantcode': {
          const number = integration.number

          state = {
            mode: 'WantCode',
            buttons: {
              primary: {
                label: ui.string.Next,
                handler: h(() => command(number, 'next', code)),
                disabled: code.match(/^\d{5}$/) == null
              },
              secondary: { label: telegram.string.Cancel, handler: close }
            }
          }

          break
        }

        case 'wantpassword': {
          const number = integration.number

          state = {
            mode: 'WantPassword',
            buttons: {
              primary: {
                label: ui.string.Next,
                handler: h(() => command(number, 'next', password)),
                disabled: password.length === 0
              },
              secondary: { label: telegram.string.Cancel, handler: close }
            }
          }

          break
        }
      }
    }
  }

  async function init (): Promise<void> {
    try {
      const integrations = await list()

      if (integrations.length === 0) {
        integration = 'Missing'
      } else {
        integration = integrations[0]
      }
    } catch (ex: any) {
      console.error(ex)
      state = {
        mode: 'Error',
        hint: ex.message,

        buttons: {
          primary: { label: ui.string.Ok, handler: close }
        }
      }
    }
  }

  void init()
</script>

{#if state.mode === 'Authorized'}
<ChannelsConfig/>
{:else}
<div class="card">
  <div class="flex-between header">
    <div class="overflow-label fs-title"><Label label={telegram.string.ConnectFull} /></div>
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <div class="tool" on:click={close}>
      <IconClose size={'small'} />
    </div>
  </div>

  <div class="content">
    {#if state.mode === 'Loading'}
      <Label label={telegram.string.Loading} />
    {:else if state.mode === 'WantPhone'}
      <Label label={telegram.string.PhoneDescr} />

      <EditBox label={telegram.string.Phone} placeholder={telegram.string.PhonePlaceholder} bind:value={phone} />
    {:else if state.mode === 'WantCode'}
      <Label label={telegram.string.CodeDescr} />

      <PinPad length={5} bind:value={code} bind:error />
    {:else if state.mode === 'WantPassword'}
      <Label label={telegram.string.PasswordDescr} />

      <EditBox
        label={telegram.string.Password}
        format="password"
        placeholder={telegram.string.Password}
        bind:value={password}
      />
    {:else if state.mode === 'Authorized'}
      <Label label={telegram.string.IntegrationConnected} params={{ phone: state.hint }} />
    {:else if state.mode === 'Error'}
      <p>Error: {state.hint}</p>
    {/if}

    <div class="footer">
      {#if state.buttons?.primary}
        <Button
          label={state.buttons.primary.label}
          kind={'primary'}
          disabled={state.buttons.primary.disabled}
          on:click={state.buttons.primary.handler}
        />
      {/if}

      {#if state.buttons?.secondary}
        <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
        <div class="link over-underline" on:click={state.buttons.secondary.handler}>
          <Label label={state.buttons.secondary.label} />
        </div>
      {/if}
    </div>
  </div>
</div>
{/if}

<style lang="scss">
  .card {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 20rem;
    min-width: 20rem;
    max-width: 20rem;
    background: var(--popup-bg-color);
    border-radius: 0.75rem;
    box-shadow: var(--popup-shadow);

    .header {
      flex-shrink: 0;
      margin: 1.75rem 1.75rem 1.25rem;

      .tool {
        cursor: pointer;
        &:hover {
          color: var(--caption-color);
        }
        &:active {
          color: var(--accent-color);
        }
      }
    }

    .content {
      flex-shrink: 0;
      flex-grow: 1;
      height: fit-content;
      margin: 0 1.75rem 0.5rem;
      p {
        margin: 0 0 1rem;
      }

      .footer {
        display: flex;
        flex-direction: row-reverse;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 0rem;

        .link {
          color: var(--accent-color);
          &:hover {
            color: var(--caption-color);
          }
          &:active {
            color: var(--accent-color);
          }
        }
      }
    }
  }
</style>
