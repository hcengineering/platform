<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import type { Ref } from '@anticrm/core'
  import { createEventDispatcher } from 'svelte'
  import { EditBox, Button } from '@anticrm/ui'
  import { getClient } from '@anticrm/presentation'

  import contact, { ChannelProvider, Channel } from '@anticrm/contact'

  export let values: Channel[]
  let newValues: Channel[] = []

  const dispatch = createEventDispatcher()

  let providers: ChannelProvider[] = []

  function findValue(provider: Ref<ChannelProvider>): number {
    for (let i = 0; i<values.length; i++) {
      if (values[i].provider === provider) return i
    }
    return -1
  }

  const client = getClient()
  client.findAll(contact.class.ChannelProvider, {}).then(result => { 
    providers = result
    for (const provider of providers) {
      const i = findValue(provider._id)
      if (i !== -1) {
        newValues.push({ provider: provider._id, value: values[i].value })
      } else {
        newValues.push({ provider: provider._id, value: '' })
      }
    }
  })


</script>

<div class="popup">
  <div class="popup-block">
    <span>Contact</span>
    {#each providers as provider, i}
      <EditBox label={provider.label} placeholder={'+7 (000) 000-00-00'} bind:value={newValues[i].value} maxWidth={'12.5rem'}/>
    {/each}
  </div>
  <!-- <div class="popup-block">
    <span>SOCIAL LINKS</span>
    <EditBox label={'Twitter'} placeholder={'@rosychen'} maxWidth={'12.5rem'} />
    <EditBox label={'Facebook'} placeholder={'facebook/rosamundch'} maxWidth={'12.5rem'} />
  </div> -->
  <Button label="Apply" on:click={() => { dispatch('close', newValues) }}/>
</div>

<style lang="scss">
  .popup {
    display: flex;
    flex-direction: column;
    padding: 1.5rem 1.25rem;
    width: 15rem;
    max-width: 15rem;
    color: var(--theme-caption-color);
    background-color: var(--theme-button-bg-hovered);
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: .75rem;
    box-shadow: 0px 1.25rem 3.75rem rgba(0, 0, 0, .6);

    &-block {
      display: grid;
      grid-auto-flow: row;
      row-gap: .75rem;

      span {
        font-weight: 600;
        font-size: 0.625rem;
        color: var(--theme-caption-color);
        text-transform: uppercase;
      }
    }
  }
  .popup-block + .popup-block {
    margin-top: 2rem;
  }
</style>
