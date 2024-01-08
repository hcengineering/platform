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
  import core, {
    AnyAttribute,
    ArrOf,
    AttachedDoc,
    Class,
    ClassifierKind,
    Collection,
    Doc,
    EnumOf,
    Ref,
    RefTo,
    Type
  } from '@hcengineering/core'
  import { IntlString, getResource } from '@hcengineering/platform'
  import presentation, { MessageBox, createQuery, getClient } from '@hcengineering/presentation'
  import {
    Action,
    ActionIcon,
    AnySvelteComponent,
    ButtonIcon,
    Icon,
    IconAdd,
    IconDelete,
    IconEdit,
    IconMoreV2,
    Label,
    Menu,
    getEventPositionElement,
    showPopup,
    IconSettings,
    IconOpenedArrow
  } from '@hcengineering/ui'
  import { getContextActions } from '@hcengineering/view-resources'
  import settings from '../plugin'
  import CreateAttribute from './CreateAttribute.svelte'
  import EditAttribute from './EditAttribute.svelte'
  import EditClassLabel from './EditClassLabel.svelte'
  import { settingsStore, clearSettingsStore } from '../store'
  import TypesPopup from './typeEditors/TypesPopup.svelte'

  export let _class: Ref<Class<Doc>>
  export let ofClass: Ref<Class<Doc>> | undefined = undefined
  export let useOfClassAttributes = true
  export let showTitle = true

  export let attributeMapper:
  | {
    component: AnySvelteComponent
    label: IntlString
    props: Record<string, any>
  }
  | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const classQuery = createQuery()

  let clazz: Class<Doc> | undefined
  let hovered: number | null = null
  let selected: number | null = null
  let btnAdd: ButtonIcon

  $: classQuery.query(core.class.Class, { _id: _class }, (res) => {
    clazz = res.shift()
  })
  $: attributes = getCustomAttributes(_class)

  function getCustomAttributes (_class: Ref<Class<Doc>>): AnyAttribute[] {
    const cl = hierarchy.getClass(_class)
    const attributes = Array.from(
      hierarchy
        .getAllAttributes(_class, _class === ofClass && useOfClassAttributes ? core.class.Doc : cl.extends)
        .values()
    )
    return attributes
  }

  const attrQuery = createQuery()

  $: attrQuery.query(core.class.Attribute, { attributeOf: _class }, () => {
    attributes = getCustomAttributes(_class)
  })

  function update (): void {
    attributes = getCustomAttributes(_class)
  }

  export function createAttribute (ev: MouseEvent): void {
    showPopup(TypesPopup, { _class }, getEventPositionElement(ev), (_id) => {
      if (_id !== undefined) $settingsStore = { component: CreateAttribute, props: { _id, _class } }
    })
    // showPopup(CreateAttribute, { _class }, 'top', update)
  }

  export async function editAttribute (attribute: AnyAttribute, exist: boolean): Promise<void> {
    showPopup(EditAttribute, { attribute, exist }, 'top', update)
  }

  export async function removeAttribute (attribute: AnyAttribute, exist: boolean): Promise<void> {
    showPopup(
      MessageBox,
      {
        label: settings.string.DeleteAttribute,
        message: exist ? settings.string.DeleteAttributeExistConfirm : settings.string.DeleteAttributeConfirm
      },
      'top',
      async (result) => {
        if (result != null) {
          await client.remove(attribute)
          update()
        }
      }
    )
  }

  async function showMenu (ev: MouseEvent, attribute: AnyAttribute, row: number): Promise<void> {
    hovered = row
    const exist = (await client.findOne(attribute.attributeOf, { [attribute.name]: { $exists: true } })) !== undefined

    const actions: Action[] = [
      {
        label: presentation.string.Edit,
        icon: IconEdit,
        action: async () => {
          await selectAttribute(attribute, row)
        }
      }
    ]
    if (attribute.isCustom === true) {
      actions.push({
        label: presentation.string.Remove,
        icon: IconDelete,
        action: async () => {
          await removeAttribute(attribute, exist)
        }
      })
    }
    const extra = await getContextActions(client, attribute, { mode: 'context' })
    actions.push(
      ...extra.map((it) => ({
        label: it.label,
        icon: it.icon,
        action: async (_: any, evt: Event) => {
          const r = await getResource(it.action)
          await r(attribute, evt, it.actionProps)
        }
      }))
    )
    showPopup(Menu, { actions }, getEventPositionElement(ev), () => {
      hovered = null
    })
  }

  function getAttrType (type: Type<any>): IntlString | undefined {
    switch (type._class) {
      case core.class.RefTo:
        return client.getHierarchy().getClass((type as RefTo<Doc>).to).label
      case core.class.Collection:
        return client.getHierarchy().getClass((type as Collection<AttachedDoc>).of).label
      case core.class.ArrOf:
        return (type as ArrOf<Doc>).of.label
      default:
        return undefined
    }
  }

  async function getEnumName (type: Type<any>): Promise<string | undefined> {
    const ref = (type as EnumOf).of
    const res = await client.findOne(core.class.Enum, { _id: ref })
    return res?.name
  }
  function editLabel (evt: MouseEvent): void {
    showPopup(EditClassLabel, { clazz }, getEventPositionElement(evt))
  }
  async function selectAttribute (attribute: AnyAttribute, n: number): Promise<void> {
    if (selected === n) {
      selected = null
      clearSettingsStore()
      return
    }
    selected = n
    const exist = (await client.findOne(attribute.attributeOf, { [attribute.name]: { $exists: true } })) !== undefined
    $settingsStore = { component: EditAttribute, props: { attribute, exist } }
  }
  settingsStore.subscribe((value) => {
    if (value.component == null) selected = null
  })
  const classUpdated = (_clazz: Ref<Class<Doc>>): void => {
    selected = null
  }
  $: classUpdated(_class)
</script>

{#if showTitle}
  {#if clazz}
    <div class="flex-row-center flex-no-shrink mb-6">
      <div class="hulyInput-body">
        <Label label={clazz.label} />
      </div>
      {#if clazz.kind === ClassifierKind.MIXIN && hierarchy.hasMixin(clazz, settings.mixin.UserMixin)}
        <div class="ml-2">
          <ActionIcon icon={IconEdit} size="small" action={editLabel} />
        </div>
      {/if}
    </div>
  {/if}
{/if}
<div class="hulyTableAttr-container">
  <div class="hulyTableAttr-header font-medium-12">
    <IconSettings size={'small'} />
    <span><Label label={settings.string.ClassProperties} /></span>
    <ButtonIcon
      bind:this={btnAdd}
      kind={'primary'}
      icon={IconAdd}
      size={'small'}
      on:click={(ev) => {
        createAttribute(ev)
      }}
    />
  </div>
  {#if attributes.length}
    <div class="hulyTableAttr-content">
      {#each attributes as attr, i}
        {@const attrType = getAttrType(attr.type)}
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="hulyTableAttr-content__row"
          class:hovered={hovered === i}
          class:selected={selected === i}
          on:contextmenu={(ev) => {
            ev.preventDefault()
            void showMenu(ev, attr, i)
          }}
          on:click={async () => {
            void selectAttribute(attr, i)
          }}
        >
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="hulyTableAttr-content__row-dragMenu" on:click|stopPropagation={(ev) => showMenu(ev, attr, i)}>
            <IconMoreV2 size={'small'} />
          </div>
          {#if attr.isCustom}
            <div class="hulyChip-item font-medium-12">
              <Label label={settings.string.Custom} />
            </div>
          {/if}
          {#if attr.icon !== undefined}
            <div class="hulyTableAttr-content__row-icon">
              <Icon icon={attr.icon} size={'small'} />
            </div>
          {/if}
          <div class="hulyTableAttr-content__row-label font-regular-14" class:accent={!attr.hidden}>
            <Label label={attr.label} />
          </div>
          {#if attributeMapper}
            <svelte:component this={attributeMapper.component} {...attributeMapper.props} attribute={attr} />
          {/if}
          <div class="hulyTableAttr-content__row-type font-medium-12">
            <Label label={attr.type.label} />
            {#if attrType !== undefined}
              : <Label label={attrType} />
            {/if}
            {#if attr.type._class === core.class.EnumOf}
              {#await getEnumName(attr.type) then name}
                {#if name}
                  : {name}
                {/if}
              {/await}
            {/if}
          </div>
          <div class="hulyTableAttr-content__row-arrow">
            <IconOpenedArrow size={'small'} />
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .hulyInput-body {
    flex-grow: 1;
    flex-shrink: 0;
    padding: var(--spacing-1) var(--spacing-2);
    font-weight: 500;
    font-size: 1.5rem;
    line-height: 2rem;
    color: var(--input-TextColor);
  }
  .hulyTableAttr-container {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    align-self: stretch;
    background-color: var(--theme-table-row-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: var(--large-BorderRadius);

    .hulyTableAttr-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      align-self: stretch;
      flex-shrink: 0;
      padding: var(--spacing-2) var(--spacing-2) var(--spacing-2) var(--spacing-2_5);
      text-transform: uppercase;
      color: var(--global-secondary-TextColor);

      span {
        flex-grow: 1;
        margin-left: var(--spacing-1_5);
      }
    }
    .hulyTableAttr-content {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      align-self: stretch;
      flex-shrink: 0;
      padding: var(--spacing-1);
      border-top: 1px solid var(--theme-divider-color);

      &__row {
        display: flex;
        align-items: center;
        align-self: stretch;
        gap: var(--spacing-1);
        padding: var(--spacing-1) var(--spacing-2) var(--spacing-1) var(--spacing-1);
        border-radius: var(--small-BorderRadius);
        cursor: pointer;

        &-dragMenu {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-shrink: 0;
          width: var(--global-extra-small-Size);
          height: var(--global-extra-small-Size);
          border-radius: var(--extra-small-BorderRadius);
        }
        &-icon {
          width: var(--global-min-Size);
          height: var(--global-min-Size);
          color: var(--global-primary-TextColor);
        }
        &-label {
          white-space: nowrap;
          word-break: break-all;
          text-overflow: ellipsis;
          overflow: hidden;
          display: flex;
          align-items: center;
          flex-grow: 1;
          min-width: 0;
          color: var(--global-primary-TextColor);

          &.accent {
            font-weight: 500;
          }
        }
        &-type {
          text-transform: uppercase;
          color: var(--global-secondary-TextColor);
        }
        &-arrow {
          display: none;
          flex-shrink: 0;
          width: var(--global-min-Size);
          height: var(--global-min-Size);
          color: var(--global-primary-LinkColor);
        }

        &.hovered,
        &:hover {
          background-color: var(--theme-table-header-color); // var(--global-surface-03-hover-BackgroundColor);
        }
        &.selected {
          background-color: var(--theme-table-header-color); // var(--global-surface-03-hover-BackgroundColor);

          .hulyTableAttr-content__row-icon,
          .hulyTableAttr-content__row-arrow,
          .hulyTableAttr-content__row-label {
            color: var(--global-primary-LinkColor);
          }
          .hulyTableAttr-content__row-type {
            color: var(--global-primary-TextColor);
          }
          .hulyTableAttr-content__row-label {
            font-weight: 700;
          }
        }
        &.hovered .hulyTableAttr-content__row-arrow,
        &:hover .hulyTableAttr-content__row-arrow,
        &.selected .hulyTableAttr-content__row-arrow {
          display: block;
        }
      }
    }
  }
</style>
