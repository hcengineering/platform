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
  import { AttachedData, Ref } from '@hcengineering/core'
  import { createEventDispatcher } from 'svelte'
  import { EditBox, Button, ScrollBox, Label } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'

  import { ChannelProvider, Channel } from '@hcengineering/contact'
  import contact from '../plugin'

  export let values: Channel[]
  const newValues: AttachedData<Channel>[] = []

  const dispatch = createEventDispatcher()

  let providers: ChannelProvider[] = []

  function findValue (provider: Ref<ChannelProvider>): number {
    for (let i = 0; i < values.length; i++) {
      if (values[i].provider === provider) return i
    }
    return -1
  }

  const client = getClient()
  client.findAll(contact.class.ChannelProvider, {}).then((result) => {
    providers = result
    for (const provider of providers) {
      const i = findValue(provider._id)
      if (i !== -1) {
        newValues.push({ ...values[i] })
      } else {
        newValues.push({ provider: provider._id, value: '' })
      }
    }
  })

  function filterUndefined (channels: AttachedData<Channel>[]): AttachedData<Channel>[] {
    return channels.filter((channel) => channel.value !== undefined && channel.value.length > 0)
  }
</script>

<div class="popup">
  <ScrollBox vertical stretch>
    <div class="popup-block">
      <span><Label label={contact.string.SocialLinks} /></span>
      {#each providers as provider, i}
        <EditBox label={provider.label} placeholder={provider.placeholder} bind:value={newValues[i].value} />
      {/each}
    </div>
  </ScrollBox>
  <div class="buttons">
    <div class="btn">
      <Button
        label={contact.string.Apply}
        width={'100%'}
        on:click={() => {
          dispatch('close', filterUndefined(newValues))
        }}
      />
    </div>
  </div>
</div>

<style lang="scss">
  .popup {
    display: flex;
    flex-direction: column;
    padding: 1.5rem 1.25rem 1.25rem;
    width: 17rem;
    max-width: 17rem;
    height: 22rem;
    color: var(--caption-color);
    background-color: var(--popup-bg-color);
    border-radius: 0.75rem;
    box-shadow: var(--popup-shadow);

    &-block {
      display: grid;
      grid-auto-flow: row;
      row-gap: 0.75rem;

      span {
        font-weight: 600;
        font-size: 0.625rem;
        color: var(--caption-color);
        text-transform: uppercase;
      }
    }
  }
  .buttons {
    display: flex;
    align-items: center;
    margin-top: 1rem;
    .btn {
      flex-grow: 1;
    }
  }
</style>
