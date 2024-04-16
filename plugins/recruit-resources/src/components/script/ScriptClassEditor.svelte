<!--
//
// Copyright © 2024 Hardcore Engineering Inc.
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
//
-->

<script lang="ts">
  import core, { as, type Class, type Obj, type Ref, SortingOrder, type Type } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { makeRank } from '@hcengineering/rank'
  import type { ScriptAttribute } from '@hcengineering/recruit'
  import {
    type Action,
    DropdownLabelsPopupIntl,
    getEventPopupPositionElement,
    getPopupPositionElement,
    Icon,
    IconAdd,
    IconMoreV,
    Menu,
    showPopup
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import type { ComponentProps } from 'svelte'
  import { addScriptTypedAttribute, getScriptAttributeTypeClasses } from '../../utils'
  import AttributeEditor from './AttributeEditor.svelte'
  import AttributeTitleEditor from './AttributeTitleEditor.svelte'

  type T = $$Generic<Obj>

  export let object: Class<T>
  export let readonly: boolean

  let attributes: Array<ScriptAttribute> = []
  const attributesQuery = createQuery()
  $: {
    attributesQuery.query<ScriptAttribute>(
      core.class.Attribute,
      {
        attributeOf: object._id
      },
      (result) => {
        attributes = result
      },
      {
        sort: {
          rank: SortingOrder.Ascending
        }
      }
    )
  }

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let addingAfterIndex: number | -1 | null = null
  let lastAddedAttributeRef: Ref<ScriptAttribute> | null = null
  const nameEditors: Record<Ref<ScriptAttribute>, AttributeTitleEditor> = {}
  $: if (lastAddedAttributeRef !== null) {
    const editor = nameEditors[lastAddedAttributeRef]
    if (editor !== undefined) {
      editor.focus()
      lastAddedAttributeRef = null
    }
  }

  const typeClasses = getScriptAttributeTypeClasses(hierarchy)

  async function onAdd (event: Event, index: number | -1): Promise<void> {
    const divider = event.target as HTMLButtonElement
    addingAfterIndex = index

    showPopup(
      DropdownLabelsPopupIntl,
      as<ComponentProps<DropdownLabelsPopupIntl>>({
        autoFocus: true,
        items: [...typeClasses.values()].map((typeClass) => ({
          id: typeClass._id,
          label: typeClass.label
        }))
      }),
      getPopupPositionElement((divider.firstChild as HTMLElement) ?? divider),
      async (typeClassId: Ref<Class<Type<any>>> | undefined) => {
        const typeClass: Class<Type<any>> | undefined =
          typeClassId === undefined ? undefined : typeClasses.get(typeClassId)

        if (readonly || typeClass === undefined) {
          addingAfterIndex = null
          divider.focus()
          return
        }
        lastAddedAttributeRef = await addScriptTypedAttribute(client, object._id, typeClass, {
          title: '',
          rank: makeRank(attributes[index]?.rank, attributes[index + 1]?.rank)
        })
        addingAfterIndex = null
      }
    )
  }

  async function onContextMenu (event: Event, attribute: ScriptAttribute): Promise<void> {
    if (readonly) {
      return
    }

    // TODO: Prefer native context menu?
    const actions: Action[] = [
      {
        label: view.string.Delete,
        icon: view.icon.Delete,
        action: async () => {
          if (readonly) {
            return
          }
          await client.remove(attribute)
        },
        group: 'delete'
      }
    ]

    showPopup(Menu, as<ComponentProps<Menu>>({ actions }), getEventPopupPositionElement(event))
  }
</script>

<div class="antiSection">
  <button
    class="divider"
    class:active={addingAfterIndex === -1 || (!readonly && attributes.length === 0)}
    disabled={readonly}
    on:click={(event) => {
      void onAdd(event, -1)
    }}
  >
    {#if !readonly}
      <span class="divider--button">
        <IconAdd size="small" />
      </span>
    {/if}
  </button>

  {#each attributes as attribute, index (attribute._id)}
    <div class="flex-row-top flex-gap-2">
      <div class="w-4 h-5 flex-center">
        {#if !readonly}
          <button
            class="antiButton bs-none no-focus"
            tabindex="-1"
            on:click={(event) => {
              void onContextMenu(event, attribute)
            }}
          >
            <Icon icon={IconMoreV} size="small" />
          </button>
        {/if}
      </div>

      <div class="flex-grow flex-col">
        <div class="font-medium">
          <AttributeTitleEditor
            bind:this={nameEditors[attribute._id]}
            bind:title={attribute.title}
            {readonly}
            on:change={(event) => {
              if (!readonly && event.detail !== attribute.title) {
                void client.update(attribute, { title: event.detail })
              }
            }}
          />
        </div>

        <AttributeEditor object={attribute} {readonly} />
      </div>
    </div>

    <button
      class="divider"
      class:active={addingAfterIndex === index}
      disabled={readonly}
      on:click={(event) => {
        void onAdd(event, index)
      }}
    >
      {#if !readonly}
        <span class="divider--button">
          <IconAdd size="small" />
        </span>
      {/if}
    </button>
  {/each}
</div>

<style lang="scss">
  .divider {
    align-items: center;
    appearance: none;
    border: 0;
    display: flex;
    justify-content: space-between;
    overflow: visible;
    padding: 0.5rem 0;
    width: 100%;

    &::after {
      background-color: transparent;
      content: '';
      height: 1px;
      margin-bottom: -0.5px;
      margin-top: -0.5px;
      width: 100%;
    }

    .divider--button {
      border-radius: 50%;
      display: none;
      position: relative;
      margin: -1rem 0 -1rem 0;
      z-index: 1;
    }

    &:not(:disabled) {
      &.active {
        .divider--button {
          background-color: var(--theme-divider-color);
          color: var(--theme-trans-color);
          display: inherit;
        }
        &::after {
          background-color: var(--theme-divider-color);
        }
      }
      &:hover,
      &:focus {
        .divider--button {
          background-color: var(--primary-button-focused);
          color: var(--primary-button-color);
          display: inherit;
        }
        &::after {
          background-color: var(--primary-button-focused);
        }
      }
    }
  }
</style>
