<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Class, Doc, Ref } from '@anticrm/core'
  import presentation, { AttributesBar, getClient, KeyedAttribute } from '@anticrm/presentation'
  import { Button, IconAdd, Label, showPopup, Tooltip } from '@anticrm/ui'
  import view from '@anticrm/view'
  import { createEventDispatcher } from 'svelte'
  import { collectionsFilter, getFiltredKeys } from '../utils'

  export let object: Doc
  export let objectClass: Class<Doc>
  export let to: Ref<Class<Doc>> | undefined
  export let ignoreKeys: string[] = []
  export let vertical: boolean
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let keys: KeyedAttribute[] = []
  let collapsed: boolean = false

  function updateKeys (ignoreKeys: string[]): void {
    const filtredKeys = getFiltredKeys(hierarchy, objectClass._id, ignoreKeys, to)
    keys = collectionsFilter(hierarchy, filtredKeys, false)
  }

  $: updateKeys(ignoreKeys)

  const dispatch = createEventDispatcher()
</script>

{#if vertical}
  <div class="attrbar-header" on:click={() => { collapsed = !collapsed }}>
    <div class="flex-row-center">
      <span class="overflow-label">
        <Label label={objectClass.label} />
      </span>
      <div class="icon-arrow" class:collapsed>
        <svg fill="var(--dark-color)" viewBox="0 0 6 6" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,0L6,3L0,6Z" />
        </svg>
      </div>
    </div>
    <div class="tool">
      <Tooltip label={presentation.string.Create}>
        <Button
          icon={IconAdd}
          kind={'transparent'}
          on:click={(ev) => {
            ev.stopPropagation()
            showPopup(view.component.CreateAttribute, { _class: objectClass._id }, 'top', () => {
              updateKeys(ignoreKeys)
              dispatch('update')
            })
          }}
        />
      </Tooltip>
    </div>
  </div>
{/if}
{#if (keys.length || !vertical)}
  <div class="collapsed-container" class:collapsed>
    <AttributesBar {object} {keys} {vertical} />
  </div>
{/if}

<style lang="scss">
  .attrbar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 0.25rem -0.5rem 0.75rem;
    padding: 0 0 0 0.5rem;
    font-weight: 600;
    // font-size: 0.75rem;
    color: var(--dark-color);
    // background-color: var(--divider-color);
    border: 1px solid var(--divider-color);
    border-radius: 0.25rem;
    cursor: pointer;
    transition-property: color, background-color, border-color;
    transition-duration: 0.15s;
    transition-timing-function: var(--timing-main);

    .icon-arrow {
      margin-left: .5rem;
      width: .325rem;
      height: .325rem;
      opacity: 0;
      transform-origin: 35% center;
      transform: rotate(90deg);
      transition-property: transform, opacity;
      transition-duration: 0.15s;
      transition-timing-function: var(--timing-main);

      &.collapsed {
        opacity: 1;
        transform: rotate(0deg);
      }
    }

    .tool {
      display: flex;
      justify-content: center;
      align-items: center;
      opacity: 0;
      transition: opacity .15s var(--timing-main);
    }
    &:hover {
      color: var(--caption-color);
      background-color: var(--menu-bg-select);
      border-color: transparent;

      .icon-arrow {
        opacity: 1;
      }
      .tool {
        opacity: 1;
      }
    }
  }
  .collapsed-container {
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: 1000px;
    transition: max-height 0.2s var(--timing-main);

    &.collapsed {
      max-height: 0;
    }
  }
</style>
