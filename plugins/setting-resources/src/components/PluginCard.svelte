<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { Button, Component, eventToHTMLElement, Label, Link } from '@hcengineering/ui'
  import { getResource } from '@hcengineering/platform'
  import { showPopup } from '@hcengineering/ui'
  import type { Integration, IntegrationType } from '@hcengineering/setting'
  import setting from '../plugin'
  import { getClient } from '@hcengineering/presentation'
  import { getCurrentAccount, Ref, Space } from '@hcengineering/core'

  export let integrationType: IntegrationType
  export let integration: Integration | undefined
  const accountId = getCurrentAccount()._id
  const client = getClient()
  const onDisconnectP = getResource(integrationType.onDisconnect)
  const space = accountId as string as Ref<Space>

  async function close (res: any): Promise<void> {
    if (res?.value) {
      await client.createDoc(setting.class.Integration, space, {
        type: integrationType._id,
        value: res.value,
        disabled: false
      })
    }
  }

  async function reconnect (res: any): Promise<void> {
    if (res?.value) {
      const current = await client.findOne(setting.class.Integration, {
        space,
        type: integrationType._id
      })
      if (current === undefined) return
      await client.update(current, {
        disabled: false
      })
    }
  }

  async function disconnect (): Promise<void> {
    if (integration !== undefined) {
      await (
        await onDisconnectP
      )()
    }
  }
  const handleAdd = (e: any) => {
    showPopup(integrationType.createComponent, {}, eventToHTMLElement(e), close)
  }
  const handleReconnect = (e: any) => {
    if (integrationType.reconnectComponent) {
      showPopup(integrationType.reconnectComponent, {}, eventToHTMLElement(e), reconnect)
    }
  }
</script>

<div class="flex-col plugin-container">
  <div class="flex-row-center header">
    <div class="icon mr-4"><Component is={integrationType.icon} /></div>
    <div class="flex-grow flex-col">
      <div class="fs-title max-label overflow-label"><Label label={integrationType.label} /></div>
      <div class="text-sm content-dark-color max-label overflow-label">
        <Label label={integrationType.description} />
      </div>
    </div>
  </div>
  <div class="content">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod temp</div>
  <div class="footer">
    {#if integration}
      {#if integration.disabled && integrationType.reconnectComponent}
        <Button label={setting.string.Reconnect} kind={'primary'} on:click={handleReconnect} />
      {:else}
        <Button label={setting.string.Disconnect} on:click={disconnect} />
      {/if}
    {:else}
      <Button label={setting.string.Add} kind={'primary'} on:click={handleAdd} />
      <Link label={'Learn more'} />
    {/if}
  </div>
</div>

<style lang="scss">
  .plugin-container {
    background-color: var(--theme-button-bg-enabled);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: 0.75rem;
  }
  .header {
    margin: 1.5rem 1.5rem 1rem;
  }
  .max-label {
    max-width: calc(100% - 6.25rem);
  }
  .icon {
    flex-shrink: 0;
    width: 2.25rem;
    height: 2.25rem;
  }
  .content {
    margin: 0 1.5rem 0.25rem;
    color: var(--theme-caption-color);
  }
  .footer {
    flex-shrink: 0;
    display: grid;
    grid-auto-flow: column;
    direction: rtl;
    justify-content: start;
    align-items: center;
    column-gap: 1rem;
    padding: 1.5rem 1.75rem 1.25rem;
    height: 5.25rem;
    mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0) 1.25rem, rgba(0, 0, 0, 1) 2.5rem);
    overflow: hidden;
    border-radius: 0 0 1.25rem 1.25rem;
  }
</style>
