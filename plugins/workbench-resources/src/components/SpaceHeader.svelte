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
  import type { Ref, Space } from '@anticrm/core'
  import { Icon, ActionIcon, Button } from '@anticrm/ui'
  import type { AnyComponent } from '@anticrm/ui'
  import MoreH from './icons/MoreH.svelte'
  import Add from './icons/Add.svelte'
  import Star from './icons/Star.svelte'

  import { getClient } from '@anticrm/presentation'
  import { showModal } from '@anticrm/ui'
  import { classIcon } from '../utils'
  import core from '@anticrm/core'

  export let space: Ref<Space> | undefined
  export let createItemDialog: AnyComponent | undefined

  const client = getClient()
  let data: Space | undefined

  let unsubscribe = () => {}
  $: {
    unsubscribe()
    unsubscribe = client.query(core.class.Space, { _id: space }, result => { data = result[0] })
  }

  function showCreateDialog() {
    showModal(createItemDialog as AnyComponent, { space })
  }
</script>

<div class="header">
  {#if data}
  <div class="caption">
    <div class="title">
      <span><Icon icon={classIcon(client, data._class)} size={'small'}/></span>
      {data.name}
    </div>
    <div class="subtitle">{data.description}</div>
  </div>
  {#if createItemDialog}
    <Button label="Create" primary={true} on:click={showCreateDialog}/>
  {/if}
  <div class="buttons">
    <div class="button"><ActionIcon icon={Star} size={'small'}/></div>
    <div class="button"><ActionIcon icon={Add} size={'small'}/></div>
    <div class="button"><ActionIcon icon={MoreH} size={'small'}/></div>
  </div>
  {/if}
</div>

<style lang="scss">
  .header {
    width: 100%;
    height: 72px;
    min-height: 72px;
    border-bottom: 1px solid var(--theme-menu-divider);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 32px 0 40px;

    .caption {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      color: var(--theme-caption-color);

      .title {
        display: flex;
        align-items: center;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        user-select: none;
        font-size: 16px;
        font-weight: 500;

        span {
          width: 16px;
          height: 16px;
          margin-right: 8px;
        }
      }
      .subtitle {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        font-size: 12px;
        font-weight: 400;
        opacity: .3;
        user-select: none;
      }
    }

    .buttons {
      display: flex;
      margin-left: 24px;
      .button {
        width: 16px;
        height: 16px;
      }
      .button + .button {
        margin-left: 16px;
      }
    }
  }
</style>