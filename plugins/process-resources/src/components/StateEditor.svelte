<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { getClient, MessageBox } from '@hcengineering/presentation'
  import { Process, State } from '@hcengineering/process'
  import { settingsStore } from '@hcengineering/setting-resources'
  import {
    Button,
    ButtonIcon,
    DropdownIntlItem,
    DropdownLabelsPopupIntl,
    EditBox,
    eventToHTMLElement,
    IconAdd,
    IconMoreV,
    Menu,
    showPopup
  } from '@hcengineering/ui'
  import view from '@hcengineering/view-resources/src/plugin'
  import plugin from '../plugin'
  import { initStep } from '../utils'
  import ActionPresenter from './ActionPresenter.svelte'
  import Aside from './Aside.svelte'

  export let value: State
  export let process: Process

  let hovered: boolean = false

  const client = getClient()

  async function onMenuClick (ev: MouseEvent): Promise<void> {
    const actions = [
      {
        label: view.string.Delete,
        icon: view.icon.Delete,
        action: async () => {
          showPopup(MessageBox, {
            label: plugin.string.DeleteState,
            message: plugin.string.DeleteStateConfirm,
            action: async () => {
              // to do handle on server trigger (the last shouldnt have the endAction, we should rollback processes with current active state)
              await client.remove(value)
            }
          })
        }
      }
    ]
    hovered = true
    showPopup(Menu, { actions }, eventToHTMLElement(ev), () => {
      hovered = false
    })
  }

  function addAction (e: MouseEvent): void {
    const items: DropdownIntlItem[] = client
      .getModel()
      .findAllSync(plugin.class.Method, { systemOnly: false })
      .map((x) => ({
        id: x._id,
        label: x.label
      }))

    showPopup(DropdownLabelsPopupIntl, { items }, eventToHTMLElement(e), async (res) => {
      if (res !== undefined) {
        const step = await initStep(res)
        const length = value.actions.push(step)
        await client.update(value, { actions: value.actions })
        editAction(length - 1)
      }
    })
  }

  function editAction (index: number): void {
    $settingsStore = { id: value._id, component: Aside, props: { process, value, index } }
  }

  async function saveTitle (): Promise<void> {
    await client.update(value, { title: value.title })
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="hulyTableAttr-container">
  <div class="item flex-col-center w-full mb-4" class:hovered>
    <div class="flex-between w-full header">
      <EditBox bind:value={value.title} on:change={saveTitle} />
      <div class="flex-center flex-no-shrink tool mr-2">
        <ButtonIcon kind="tertiary" icon={IconMoreV} size={'min'} on:click={onMenuClick} />
      </div>
      <ButtonIcon kind="primary" icon={IconAdd} size={'extra-small'} on:click={addAction} />
    </div>
    {#if value.endAction != null}
      <Button
        justify="left"
        kind="ghost"
        width="100%"
        on:click={() => {
          editAction(-1)
        }}
      >
        <svelte:fragment slot="content">
          <ActionPresenter value={value.endAction} {process} />
        </svelte:fragment>
      </Button>
    {/if}
    {#each value.actions as action, i}
      <Button
        justify="left"
        kind="ghost"
        width="100%"
        on:click={() => {
          editAction(i)
        }}
      >
        <svelte:fragment slot="content">
          <ActionPresenter value={action} {process} />
        </svelte:fragment>
      </Button>
    {/each}
  </div>
</div>

<style lang="scss">
  .item {
    align-self: center;
    width: 30rem;
    border-bottom: 1px solid var(--theme-divider-color);

    .header {
      line-height: 1.5rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--theme-divider-color);
    }

    &:hover {
      .tool {
        display: flex;
      }
    }

    &.hovered {
      .tool {
        display: flex;
      }
    }

    .tool {
      display: none;
    }
  }
</style>
