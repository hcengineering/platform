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
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Process, Transition } from '@hcengineering/process'
  import { settingsStore } from '@hcengineering/setting-resources'
  import { Button, Icon } from '@hcengineering/ui'
  import plugin from '../../plugin'
  import AsideTransitionEditor from './AsideTransitionEditor.svelte'
  import TransitionPresenter from './TransitionPresenter.svelte'
  import TriggerPresenter from './TriggerPresenter.svelte'

  export let transition: Transition
  export let process: Process
  export let direction: 'from' | 'to'
  export let readonly: boolean = false

  const client = getClient()

  let from = client.getModel().findObject(transition.from)
  let to = transition.to === null ? null : client.getModel().findObject(transition.to)

  const query = createQuery()
  query.query(plugin.class.State, {}, () => {
    from = client.getModel().findObject(transition.from)
    to = transition.to === null ? null : client.getModel().findObject(transition.to)
  })

  function edit (): void {
    $settingsStore = { id: transition._id, component: AsideTransitionEditor, props: { readonly, process, transition } }
  }
</script>

<div class="w-full container">
  <div class="innerContainer">
    <Button on:click={edit} kind="ghost" width={'100%'} padding={'0'} size="small">
      <div class="flex-between w-full" slot="content">
        <div class="flex-row-center flex-gap-2">
          <TriggerPresenter {process} value={transition.trigger} params={transition.triggerParams} />
          <TransitionPresenter {transition} {direction} />
        </div>
        <div class="flex-row-center">
          {#if transition.to !== null}
            <Icon icon={plugin.icon.Process} size="small" />
            {transition.actions.length}
          {/if}
        </div>
      </div>
    </Button>
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
