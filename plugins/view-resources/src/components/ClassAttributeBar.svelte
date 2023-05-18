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
  import core, { Class, Doc, Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { AttributesBar, KeyedAttribute, getAttribute, getClient } from '@hcengineering/presentation'
  import setting, { settingId } from '@hcengineering/setting'
  import { Button, Label, getCurrentResolvedLocation, navigate } from '@hcengineering/ui'
  import { getFiltredKeys, isCollectionAttr } from '../utils'

  export let object: Doc | Record<string, any>
  export let _class: Ref<Class<Doc>>
  export let to: Ref<Class<Doc>> | undefined = core.class.Doc
  export let ignoreKeys: string[] = []
  export let allowedCollections: string[] = []
  export let readonly = false
  export let showLabel: IntlString | undefined = undefined
  export let draft = false
  export let showHeader: boolean = true

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let keys: KeyedAttribute[] = []

  function updateKeys (_class: Ref<Class<Doc>>, ignoreKeys: string[], to: Ref<Class<Doc>> | undefined): void {
    const filtredKeys = getFiltredKeys(hierarchy, _class, ignoreKeys, to)
    keys = filtredKeys.filter((key) => !isCollectionAttr(hierarchy, key) || allowedCollections.includes(key.key))
  }

  $: updateKeys(_class, ignoreKeys, to)

  $: nonEmpty = keys.find((it) => getAttribute(client, object, it) != null)

  $: label = showLabel ?? hierarchy.getClass(_class).label

  function getCollapsed (_class: Ref<Class<Doc>>, nonEmpty?: KeyedAttribute): boolean {
    return nonEmpty === undefined
  }

  $: collapsed = getCollapsed(_class, nonEmpty)
</script>

{#if keys.length}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  {#if showHeader}
    <div
      class="attrbar-header"
      class:collapsed
      on:click={() => {
        collapsed = !collapsed
      }}
    >
      <div class="flex-row-center">
        <span class="overflow-label">
          <Label {label} />
        </span>
        <div class="icon-arrow">
          <svg fill="var(--theme-dark-color)" viewBox="0 0 6 6" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,0L6,3L0,6Z" />
          </svg>
        </div>
      </div>
      <div class="tool">
        <Button
          icon={setting.icon.Setting}
          kind={'link'}
          size={'medium'}
          showTooltip={{ label: setting.string.ClassSetting }}
          on:click={(ev) => {
            ev.stopPropagation()
            const loc = getCurrentResolvedLocation()
            loc.path[2] = settingId
            loc.path[3] = 'setting'
            loc.path[4] = 'classes'
            loc.path.length = 5
            loc.query = { _class }
            loc.fragment = undefined
            navigate(loc)
          }}
        />
      </div>
    </div>
  {/if}
  <div class="collapsed-container" class:collapsed>
    <AttributesBar {_class} {object} {keys} {readonly} {draft} on:update />
  </div>
{/if}

<style lang="scss">
  .attrbar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 0.125rem 0 0.75rem;
    font-weight: 600;
    color: var(--theme-dark-color);
    border-top: 1px solid var(--theme-divider-color);
    border-bottom: 1px solid var(--theme-divider-color);
    cursor: pointer;
    transition-property: color, background-color, border-color;
    transition-duration: 0.15s;
    transition-timing-function: var(--timing-main);

    &:first-child {
      border-top-color: transparent;
    }
    .icon-arrow {
      margin-left: 0.5rem;
      width: 0.325rem;
      height: 0.325rem;
      opacity: 0;
      transform-origin: 35% center;
      transform: rotate(90deg);
      transition-property: transform, opacity;
      transition-duration: 0.15s;
      transition-timing-function: var(--timing-main);
    }

    .tool {
      display: flex;
      justify-content: center;
      align-items: center;
      opacity: 0;
      transition: opacity 0.15s var(--timing-main);
    }
    &.collapsed {
      background-color: var(--theme-divider-color);
      border-color: transparent;

      .icon-arrow {
        opacity: 1;
        transform: rotate(0deg);
      }
    }
    &:hover {
      color: var(--theme-caption-color);
      background-color: var(--theme-navpanel-hovered);
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
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    max-height: 1000px;
    transition: max-height 0.2s var(--timing-main);

    &.collapsed {
      overflow: hidden;
      max-height: 0;
    }
  }
</style>
