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
  import platform, { IntlString, PlatformError } from '@hcengineering/platform'
  import ui, { Button, EditBox, IconClose, Label, IconError } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { isValidPhoneNumber } from 'libphonenumber-js'

  import PhoneInput from './PhoneInput.svelte'
  import PinPad from './PinPad.svelte'
  import telegram from '../plugin'
  import { command, getState, type IntegrationState, connect } from '../api'

  export let integration: any

  let phone: string = ''
  let code: string = ''
  let password: string = ''
  let error: string = ''
  let isLoading: boolean = false

  const dispatch = createEventDispatcher()

  function close (): void {
    dispatch('close')
  }

  // Wrapper for command API with loading state management
  async function commandWithLoading (phone: string, action: 'start' | 'next', data?: string): Promise<IntegrationState> {
    if (isLoading) {
      throw new Error('Already processing request')
    }

    try {
      isLoading = true
      return await command(phone, action, data)
    } finally {
      isLoading = false
    }
  }

  interface UIState {
    mode: 'Loading' | 'WantPhone' | 'WantCode' | 'WantPassword' | 'Authorized' | 'Configured' | 'Unauthorized' | 'Error'
    hint?: string
    errorLabel?: IntlString

    buttons?: {
      primary?: { label: IntlString, handler?: () => any, disabled?: boolean }
      secondary?: { label: IntlString, handler?: () => any }
    }
  }

  let integrationState: IntegrationState = 'Loading'
  let state: UIState = { mode: 'Loading' }

  function h (handler: () => Promise<IntegrationState>) {
    return () => {
      handler()
        .then((i) => {
          integrationState = i
        })
        .catch((error: any) => {
          state = {
            mode: 'Error',
            hint: error.message,
            errorLabel: getErrorLabel(error),
            buttons: {
              primary: { label: ui.string.Ok, handler: close }
            }
          }
        })
    }
  }

  function getErrorLabel (error: any): IntlString | undefined {
    if (error instanceof PlatformError) {
      if (error.status.code === platform.status.Unauthorized || error.status.code === platform.status.Forbidden) {
        return telegram.string.IncorrectPhoneOrCode
      } else if (error.status.code === platform.status.ConnectionClosed) {
        return telegram.string.ServiceIsUnavailable
      }
    }
    const errorMessage: string = error.message ?? ''
    if (errorMessage.toLowerCase().includes('failed to fetch')) {
      return telegram.string.ServiceIsUnavailable
    }
    return telegram.string.UnknownError
  }

  $: {
    if (integrationState === 'Loading') {
      state = { mode: 'Loading' }
    } else if (integrationState === 'Missing') {
      state = {
        mode: 'WantPhone',
        buttons: {
          primary: {
            label: ui.string.Next,
            handler: h(() => commandWithLoading(phone, 'start')),
            disabled: !isValidPhoneNumber(phone) || isLoading
          },
          secondary: { label: telegram.string.Cancel, handler: close }
        }
      }
    } else {
      switch (integrationState.status) {
        case 'authorized': {
          state = {
            mode: 'Authorized',
            hint: integrationState.number,
            buttons: {
              primary: { label: ui.string.Ok, handler: close }
              // secondary: { label: telegram.string.Disconnect }
            }
          }

          if (integrationState.socialId == null) {
            console.error('Social ID is not defined for integration state', integrationState)
            state = {
              mode: 'Error',
              hint: 'Social ID is not defined',
              buttons: {
                primary: { label: ui.string.Ok, handler: close }
              }
            }
            break
          }
          void connect(integrationState.number, integrationState.socialId)
          break
        }

        case 'wantcode': {
          const number = integrationState.number

          state = {
            mode: 'WantCode',
            buttons: {
              primary: {
                label: ui.string.Next,
                handler: h(() => commandWithLoading(number, 'next', code)),
                disabled: code.match(/^\d{5}$/) == null || isLoading
              },
              secondary: { label: telegram.string.Cancel, handler: close }
            }
          }

          break
        }

        case 'wantpassword': {
          const number = integrationState.number

          state = {
            mode: 'WantPassword',
            buttons: {
              primary: {
                label: ui.string.Next,
                handler: h(() => commandWithLoading(number, 'next', password)),
                disabled: password.length === 0 || isLoading
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
      const phone = integration?.data?.phone
      if (phone !== undefined && phone !== '') {
        integrationState = await getState(phone)
      } else {
        integrationState = 'Missing'
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
      <div class="pt-2">
        <PhoneInput label={telegram.string.Phone} placeholder={telegram.string.PhonePlaceholder} bind:value={phone} />
      </div>
    {:else if state.mode === 'WantCode'}
      <Label label={telegram.string.CodeDescr} />
      <div class="pt-2">
        <PinPad length={5} bind:value={code} bind:error />
      </div>
    {:else if state.mode === 'WantPassword'}
      <Label label={telegram.string.PasswordDescr} />

      <div class="pt-2">
        <EditBox
          label={telegram.string.Password}
          format="password"
          placeholder={telegram.string.Password}
          bind:value={password}
        />
      </div>
    {:else if state.mode === 'Authorized'}
      <Label label={telegram.string.IntegrationConnected} params={{ phone: state.hint }} />
    {:else if state.mode === 'Error'}
      <div class="flex-row-top flex-gap-1 gap-3 pt-2">
        <IconError size={'medium'} />
        {#if state.errorLabel !== undefined}
          <Label label={state.errorLabel} />
        {:else}
          <span>{state.hint}</span>
        {/if}
      </div>
    {/if}

    <div class="footer">
      {#if state.buttons?.primary}
        <Button
          label={state.buttons.primary.label}
          kind={'primary'}
          loading={isLoading}
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
