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
  import { HeaderButtonAction, SelectPopupValueType } from '../types'
  import { checkPermission, Client, getCurrentAccount, hasAccountRole, TxOperations } from '@hcengineering/core'
  import { ButtonWithDropdown, Button, Loading, IconAdd, IconDropdown } from '../index'

  export let mainActionId: number | string | null = null
  export let loading = false
  export let client: TxOperations & Client
  export let actions: HeaderButtonAction[] = []
  export let visibleActions: (string | number | null)[] = []

  let allowedActions: HeaderButtonAction[] = []
  let items: HeaderButtonAction[] = []
  let mainAction: HeaderButtonAction | undefined = undefined
  $: filterVisibleActions(allowedActions, visibleActions)
  $: filterAllowedActions(actions).catch(() => {})

  function filterVisibleActions (allowed: HeaderButtonAction[], visible: (string | number | null)[]): void {
    items = allowed.filter((action) => visible.includes(action.id))
    mainAction = items.find((a) => a.id === mainActionId)
    if (mainAction === undefined && items.length > 0) {
      mainAction = items[0]
    }
  }

  async function filterAllowedActions (actions: HeaderButtonAction[]): Promise<SelectPopupValueType[]> {
    const result: HeaderButtonAction[] = []
    for (const action of actions) {
      if (await isActionAllowed(action)) {
        result.push(action)
      }
      action.keyBinding = await action.keyBindingPromise
    }
    allowedActions = result
    return result
  }

  async function isActionAllowed (action: HeaderButtonAction): Promise<boolean> {
    if (action.accountRole === undefined && action.permissions === undefined) return true
    if (action.accountRole !== undefined && hasAccountRole(getCurrentAccount(), action.accountRole)) return true
    if (action.permissions !== undefined) {
      for (const permission of action.permissions) {
        if (await checkPermission(client, permission.id, permission.space)) return true
      }
    }
    return false
  }
</script>

{#if mainAction !== undefined}
  {#if loading}
    <Loading shrink />
  {:else}
    <div class="antiNav-subheader">
      {#if items.length === 1}
        <Button
          icon={IconAdd}
          justify="left"
          kind="primary"
          label={mainAction.label}
          width="100%"
          on:click={mainAction.callback}
          showTooltip={{
            direction: 'bottom',
            label: mainAction.label,
            keys: mainAction.keyBinding
          }}
        >
          <div slot="content" class="draft-circle-container">
            {#if mainAction.draft === true}
              <div class="draft-circle" />
            {/if}
          </div>
        </Button>
      {:else}
        <ButtonWithDropdown
          icon={IconAdd}
          justify={'left'}
          kind={'primary'}
          label={mainAction.label}
          dropdownItems={items}
          dropdownIcon={IconDropdown}
          on:dropdown-selected={(ev) => {
            items.find((a) => a.id === ev.detail)?.callback()
          }}
          on:click={mainAction.callback}
          mainButtonId={mainAction.id !== null ? String(mainAction.id).replaceAll(':', '-') : undefined}
          showTooltipMain={{
            direction: 'bottom',
            label: mainAction.label,
            keys: mainAction.keyBinding
          }}
        >
          <div slot="content" class="draft-circle-container">
            {#if mainAction.draft === true}
              <div class="draft-circle" />
            {/if}
          </div>
        </ButtonWithDropdown>
      {/if}
    </div>
  {/if}
{/if}

<style lang="scss">
  .draft-circle-container {
    margin-left: auto;
    padding-right: 12px;
  }
  .draft-circle {
    height: 6px;
    width: 6px;
    background-color: var(--primary-bg-color);
    border-radius: 50%;
  }
</style>
