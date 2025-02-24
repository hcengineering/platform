<!--
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
-->
<script lang="ts">
  import core, { AnyAttribute, Class, Doc, Ref, TxOperations, getObjectValue } from '@hcengineering/core'
  import { getClient, reduceCalls, updateAttribute } from '@hcengineering/presentation'
  import { Label, Loading, mouseAttractor, resizeObserver } from '@hcengineering/ui'
  import { AttributeModel, BuildModelKey, BuildModelOptions, Viewlet } from '@hcengineering/view'
  import { deepEqual } from 'fast-equals'
  import { createEventDispatcher } from 'svelte'
  import { showMenu } from '../actions'
  import { buildModel, restrictionStore } from '../utils'
  import view from '../plugin'

  export let objects: Doc[]
  export let config: Array<string | BuildModelKey>

  export let _class: Ref<Class<Doc>>
  export let highlightRows: boolean = false
  export let hiddenHeader: boolean = false
  export let baseMenuClass: Ref<Class<Doc>> | undefined = undefined
  export let tableId: string | undefined = undefined
  export let readonly = false

  export let selection: number | undefined = undefined

  export let onContextMenu: ((ev: MouseEvent, object: Doc) => void) | undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const refs: HTMLElement[] = []

  $: refs.length = objects.length

  $: viewlet = getViewlet(_class)

  function getViewlet (_class: Ref<Class<Doc>>): Viewlet | undefined {
    let clazz: Ref<Class<Doc>> | undefined = _class
    while (true) {
      const res = client.getModel().findAllSync(view.class.Viewlet, { attachTo: clazz })
      if (res.length > 0) {
        return (
          res.find((v) => v.descriptor === view.viewlet.Table) ?? res.find((v) => v.descriptor === view.viewlet.List)
        )
      }
      clazz = hierarchy.getClass(clazz).extends
      if (clazz === undefined) return
    }
  }

  const dispatch = createEventDispatcher()

  const showContextMenu = async (ev: MouseEvent, object: Doc, row: number): Promise<void> => {
    selection = row
    ev.stopPropagation()
    ev.preventDefault()
    if (onContextMenu !== undefined) {
      onContextMenu(ev, object)
    } else {
      showMenu(ev, { object, baseMenuClass })
    }
  }

  function onRow (object: Doc): void {
    dispatch('row-focus', object)
  }

  const joinProps = (attribute: AttributeModel, object: Doc, readonly: boolean) => {
    const readonlyParams =
      readonly || (attribute?.attribute?.readonly ?? false)
        ? {
            readonly: true,
            editable: false,
            disabled: true
          }
        : {}
    if (attribute.collectionAttr) {
      return { object, ...attribute.props, ...readonlyParams }
    }
    if (attribute.attribute?.type._class === core.class.EnumOf) {
      return { ...attribute.props, type: attribute.attribute.type, ...readonlyParams }
    }
    return { ...attribute.props, space: object.space, ...readonlyParams }
  }
  function getValue (attribute: AttributeModel, object: Doc): any {
    if (attribute.castRequest) {
      return getObjectValue(
        attribute.key.substring(attribute.castRequest.length + 1),
        client.getHierarchy().as(object, attribute.castRequest)
      )
    }
    return getObjectValue(attribute.key, object)
  }

  function onChange (value: any, doc: Doc, key: string, attribute: AnyAttribute) {
    updateAttribute(client, doc, _class, { key, attr: attribute }, value)
  }

  function getOnChange (doc: Doc, attribute: AttributeModel) {
    const attr = attribute.attribute
    if (attr === undefined) return
    if (attribute.collectionAttr) return
    if (attribute.isLookup) return
    const key = attribute.castRequest ? attribute.key.substring(attribute.castRequest.length + 1) : attribute.key
    return (value: any) => {
      onChange(value, doc, key, attr)
    }
  }

  let isBuildingModel = true
  let model: AttributeModel[] | undefined
  let modelOptions: BuildModelOptions | undefined

  const updateModelOptions = reduceCalls(async function updateModelOptions (
    client: TxOperations,
    _class: Ref<Class<Doc>>,
    keys: Array<string | BuildModelKey>
  ): Promise<void> {
    const newModelOpts = { client, _class, keys }
    if (modelOptions == null || !deepEqual(modelOptions, newModelOpts)) {
      modelOptions = newModelOpts
      await build(modelOptions)
    }
  })
  $: void updateModelOptions(client, _class, config)

  async function build (modelOptions: BuildModelOptions): Promise<void> {
    isBuildingModel = true
    const res = await buildModel(modelOptions)
    model = res
    isBuildingModel = false
  }

  function contextHandler (object: Doc, row: number): (ev: MouseEvent) => void {
    return (ev) => {
      if (!readonly) {
        void showContextMenu(ev, object, row)
      }
    }
  }
</script>

{#if !model || isBuildingModel}
  <Loading />
{:else if viewlet}
  <table id={tableId} class="antiTable" class:highlightRows>
    {#if !hiddenHeader}
      <thead class="scroller-thead">
        <tr class="scroller-thead__tr">
          {#each model as attribute}
            <th
              class:w-full={attribute.displayProps?.grow === true}
              class:align-left={attribute.displayProps?.align === 'left'}
              class:align-center={attribute.displayProps?.align === 'center'}
              class:align-right={attribute.displayProps?.align === 'right'}
            >
              <div class="antiTable-cells">
                {#if attribute.label}
                  <Label label={attribute.label} />
                {/if}
              </div>
            </th>
          {/each}
        </tr>
      </thead>
    {/if}
    {#if objects.length > 0}
      <tbody>
        {#each objects as object, row (object._id)}
          <tr
            class="antiTable-body__row"
            class:fixed={row === selection}
            class:selected={row === selection}
            on:mouseover={mouseAttractor(() => {
              onRow(object)
            })}
            on:mouseenter={mouseAttractor(() => {
              onRow(object)
            })}
            on:focus={() => {}}
            bind:this={refs[row]}
            on:contextmenu={contextHandler(object, row)}
          >
            {#each model as attribute, cell}
              <td
                class:align-left={attribute.displayProps?.align === 'left'}
                class:align-center={attribute.displayProps?.align === 'center'}
                class:align-right={attribute.displayProps?.align === 'right'}
              >
                <div class:antiTable-cells__firstCell={!cell}>
                  <svelte:component
                    this={attribute.presenter}
                    value={getValue(attribute, object)}
                    onChange={getOnChange(object, attribute)}
                    {...joinProps(attribute, object, readonly || $restrictionStore.readonly)}
                  />
                </div>
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    {/if}
  </table>
{/if}
