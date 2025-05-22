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
  import { Doc } from '@hcengineering/core'
  import { createQuery, getClient, MessageBox } from '@hcengineering/presentation'
  import { Process, State, Step, Transition } from '@hcengineering/process'
  import { settingsStore } from '@hcengineering/setting-resources'
  import {
    Button,
    ButtonIcon,
    DropdownIntlItem,
    DropdownLabelsPopupIntl,
    EditBox,
    eventToHTMLElement,
    getEventPositionElement,
    IconAdd,
    IconMoreV,
    Menu,
    showPopup
  } from '@hcengineering/ui'
  import view from '@hcengineering/view-resources/src/plugin'
  import plugin from '../../plugin'
  import { initState } from '../../utils'
  import ActionPresenter from './ActionPresenter.svelte'
  import AddTransitionButton from './AddTransitionButton.svelte'
  import AsideStepEditor from './AsideStepEditor.svelte'
  import TransitionEditor from './TransitionEditor.svelte'
  import ArrowEnd from '../icons/ArrowEnd.svelte'
  import ArrowStart from '../icons/ArrowStart.svelte'

  export let value: State
  export let process: Process
  export let readonly: boolean

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
      .findAllSync(plugin.class.Method, {})
      .map((x) => ({
        id: x._id,
        label: x.label
      }))

    showPopup(DropdownLabelsPopupIntl, { items }, getEventPositionElement(e), async (res) => {
      if (res !== undefined) {
        const step = await initState(res)
        value.actions.push(step)
        await client.update(value, { actions: value.actions })
        editAction(step)
      }
    })
  }

  function editAction (step: Step<Doc>): void {
    $settingsStore = { id: value._id, component: AsideStepEditor, props: { readonly, process, step, _id: value._id } }
  }

  async function saveTitle (): Promise<void> {
    await client.update(value, { title: value.title })
  }

  let transitionsFrom: Transition[] = []
  let transitionsTo: Transition[] = []

  const query = createQuery()
  query.query(plugin.class.Transition, {}, (res) => {
    transitionsFrom = []
    transitionsTo = []
    for (const tr of res) {
      if (tr.from === value._id) {
        transitionsFrom.push(tr)
      } else if (tr.to === value._id) {
        transitionsTo.push(tr)
      }
    }
    transitionsFrom = transitionsFrom
    transitionsTo = transitionsTo
  })
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="hulyTableAttr-container p-4">
  <div class="flex-between w-full header mb-2" class:hovered>
    <EditBox bind:value={value.title} disabled={readonly} on:change={saveTitle} />
    <div class="flex-center flex-no-shrink tool mr-2">
      <ButtonIcon kind="tertiary" icon={IconMoreV} size={'min'} on:click={onMenuClick} />
    </div>
  </div>
  <div class="flex-col-center w-full mt-1 item">
    <div class="hulyTableAttr-container block">
      {#each transitionsTo as transition (transition._id)}
        <TransitionEditor {transition} {process} {readonly} direction="to" />
      {/each}
      {#if !readonly}
        <AddTransitionButton state={value} direction="to" />
      {/if}
    </div>
    <div class="arrow">
      <ArrowStart size={'full'} />
    </div>
    <div class="hulyTableAttr-container block">
      {#each value.actions as action}
        <Button
          justify="left"
          kind="ghost"
          width="100%"
          on:click={() => {
            if (readonly) return
            editAction(action)
          }}
        >
          <svelte:fragment slot="content">
            <ActionPresenter {action} {process} {readonly} />
          </svelte:fragment>
        </Button>
      {/each}
      {#if !readonly}
        <Button kind={'ghost'} width={'100%'} icon={IconAdd} label={plugin.string.AddAction} on:click={addAction} />
      {/if}
    </div>
    <div class="arrow">
      <ArrowEnd size={'full'} />
    </div>
    <div class="hulyTableAttr-container block">
      {#each transitionsFrom as transition (transition._id)}
        <TransitionEditor {process} {transition} {readonly} direction="from" />
      {/each}
      {#if !readonly}
        <AddTransitionButton state={value} direction="from" />
      {/if}
    </div>
  </div>
</div>

<style lang="scss">
  .block {
    background-color: var(--theme-bg-color);
  }

  .arrow {
    height: 2rem;
  }

  .item {
    align-self: center;
    width: 30rem;
  }

  .header {
    line-height: 1.5rem;
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
