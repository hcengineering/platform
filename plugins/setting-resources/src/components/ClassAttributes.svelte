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
  import core, { AnyAttribute, Class, Doc, Ref } from '@anticrm/core'
  import presentation, { getClient, MessageBox } from '@anticrm/presentation'
  import {
    Action,
    CircleButton,
    eventToHTMLElement,
    IconAdd,
    IconDelete,
    IconEdit,
    Label,
    Menu,
    IconMoreV,
    showPopup
  } from '@anticrm/ui'
  import BooleanPresenter from '@anticrm/view-resources/src/components/BooleanPresenter.svelte'
  import setting from '../plugin'
  import CreateAttribute from './CreateAttribute.svelte'
  import EditAttribute from './EditAttribute.svelte'
  export let _class: Ref<Class<Doc>>

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: attributes = getCustomAttributes(_class)

  function getCustomAttributes (_class: Ref<Class<Doc>>): AnyAttribute[] {
    const attributes = Array.from(hierarchy.getAllAttributes(_class, core.class.AttachedDoc).values())
    const filtred = attributes.filter((p) => !p.hidden)
    return filtred
  }

  function update () {
    attributes = getCustomAttributes(_class)
  }

  function createAttribute () {
    showPopup(CreateAttribute, { _class }, 'top', update)
  }

  async function editAttribute (attribute: AnyAttribute, exist: boolean): Promise<void> {
    showPopup(EditAttribute, { attribute, exist }, 'top', update)
  }

  async function removeAttribute (attribute: AnyAttribute, exist: boolean): Promise<void> {
    showPopup(
      MessageBox,
      {
        label: setting.string.DeleteAttribute,
        message: exist ? setting.string.DeleteAttributeExistConfirm : setting.string.DeleteAttributeConfirm
      },
      'top',
      async (result) => {
        if (result) {
          await client.remove(attribute)
          update()
        }
      }
    )
  }

  async function showMenu (ev: MouseEvent, attribute: AnyAttribute) {
    const exist = (await client.findOne(attribute.attributeOf, { [attribute.name]: { $exist: true } })) !== undefined

    const actions: Action[] = [
      {
        label: presentation.string.Edit,
        icon: IconEdit,
        action: async () => {
          editAttribute(attribute, exist)
        }
      },
      {
        label: presentation.string.Remove,
        icon: IconDelete,
        action: async () => {
          removeAttribute(attribute, exist)
        }
      }
    ]
    showPopup(Menu, { actions }, eventToHTMLElement(ev), () => {})
  }
</script>

<div class="flex-between trans-title mb-3">
  <Label label={setting.string.Attributes} />
  <CircleButton icon={IconAdd} size="medium" on:click={createAttribute} />
</div>
<table class="antiTable">
  <thead class="scroller-thead">
    <tr class="scroller-thead__tr">
      <th>
        <div class="antiTable-cells">
          <Label label={setting.string.Attribute} />
        </div>
      </th>
      <th>
        <div class="antiTable-cells">
          <Label label={setting.string.Type} />
        </div>
      </th>
      <th>
        <div class="antiTable-cells">
          <Label label={setting.string.Custom} />
        </div>
      </th>
    </tr>
  </thead>
  <tbody>
    {#each attributes as attr}
      <tr class="antiTable-body__row" on:contextmenu|preventDefault={(ev) => showMenu(ev, attr)}>
        <td>
          <div class="antiTable-cells__firstCell">
            <Label label={attr.label} />
            {#if attr.isCustom}
              <div id="context-menu" class="antiTable-cells__firstCell-menuRow" on:click={(ev) => showMenu(ev, attr)}>
                <IconMoreV size={'small'} />
              </div>
            {/if}
          </div>
        </td>
        <td>
          <Label label={attr.type.label} />
        </td>
        <td>
          <BooleanPresenter value={attr.isCustom ?? false} />
        </td>
      </tr>
    {/each}
  </tbody>
</table>
