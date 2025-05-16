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
  import { createQuery, getClient, MessageBox } from '@hcengineering/presentation'
  import { Process, Step, Transition } from '@hcengineering/process'
  import {
    Button,
    ButtonIcon,
    DropdownIntlItem,
    DropdownLabelsPopupIntl,
    eventToHTMLElement,
    Icon,
    IconAdd,
    IconMoreV,
    Label,
    Menu,
    showPopup
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import plugin from '../../plugin'
  import { initState } from '../../utils'
  import ActionPresenter from './ActionPresenter.svelte'
  import TriggerPresenter from './TriggerPresenter.svelte'
  import AsideStepEditor from './AsideStepEditor.svelte'
  import { Doc } from '@hcengineering/core'
  import { settingsStore } from '@hcengineering/setting-resources'
  import AsideTransitionEditor from './AsideTransitionEditor.svelte'
  import TransitionPresenter from './TransitionPresenter.svelte'

  export let transition: Transition
  export let process: Process
  export let direction: 'from' | 'to'
  export let readonly: boolean = false

  const client = getClient()

  let collapsed: boolean = true

  let from = client.getModel().findObject(transition.from)
  let to = transition.to === null ? null : client.getModel().findObject(transition.to)

  const query = createQuery()
  query.query(plugin.class.State, {}, () => {
    from = client.getModel().findObject(transition.from)
    to = transition.to === null ? null : client.getModel().findObject(transition.to)
  })

  function editAction (step: Step<Doc>): void {
    $settingsStore = {
      id: transition._id,
      component: AsideStepEditor,
      props: { readonly, process, step, _id: transition._id }
    }
  }

  let hovered: boolean = false

  async function onMenuClick (ev: MouseEvent): Promise<void> {
    const actions = [
      {
        label: view.string.Delete,
        icon: view.icon.Delete,
        action: async () => {
          showPopup(MessageBox, {
            label: plugin.string.DeleteTransition,
            message: plugin.string.DeleteTransitionConfirm,
            action: async () => {
              await client.remove(transition)
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

  function add (e: MouseEvent): void {
    const items: DropdownIntlItem[] = client
      .getModel()
      .findAllSync(plugin.class.Method, {})
      .map((x) => ({
        id: x._id,
        label: x.label
      }))

    showPopup(DropdownLabelsPopupIntl, { items }, eventToHTMLElement(e), async (res) => {
      if (res !== undefined) {
        const step = await initState(res)
        const length = transition.actions.push(step)
        await client.update(transition, { actions: transition.actions })
        editAction(step)
      }
    })
  }

  function edit (): void {
    $settingsStore = { id: transition._id, component: AsideTransitionEditor, props: { readonly, process, transition } }
  }
</script>

<div class="w-full container" class:hovered>
  <div class:expand={!collapsed} class="innerContainer">
    <Button on:click={edit} kind="ghost" width={'100%'} padding={'0'} size="small">
      <div class="flex-between w-full" slot="content">
        <div class="flex-row-center flex-gap-2">
          <TriggerPresenter {process} value={transition.trigger} params={transition.triggerParams} />
          <TransitionPresenter {transition} {direction} />
        </div>
        <div class="flex-row-center">
          {#if !readonly}
            <div class="tool">
              <ButtonIcon kind="tertiary" icon={IconMoreV} size={'min'} on:click={onMenuClick} />
            </div>
          {/if}
          {#if transition.to !== null}
            <Button
              on:click={() => {
                collapsed = !collapsed
              }}
              padding={'0.25rem'}
              kind="ghost"
              size="small"
            >
              <div class="flex-row-center" slot="content">
                <Icon icon={plugin.icon.Process} size="small" />
                {transition.actions.length}
              </div>
            </Button>
          {/if}
        </div>
      </div>
    </Button>
    {#if !collapsed}
      {#each transition.actions as action}
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
        <Button label={plugin.string.AddAction} icon={IconAdd} kind={'ghost'} width={'100%'} on:click={add} />
      {/if}
    {/if}
  </div>
</div>

<style lang="scss">
  .container {
    padding: 0 0.25rem;

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

  .innerContainer {
    padding: 0.25rem 0.5rem;

    &.expand {
      box-sizing: border-box;
      border: 1px solid var(--theme-editbox-focus-border);
      border-radius: 0.5rem;
      padding-bottom: 0.25rem;
    }
  }
</style>
