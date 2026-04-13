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
  import {
    Button,
    Label,
    showPopup,
    getEventPositionElement,
    NestedSelectPopup,
    type NestedSelectItem
  } from '@hcengineering/ui'
  import { Ref, ClassifierKind, type Class, type Doc } from '@hcengineering/core'
  import { MasterTag } from '@hcengineering/card'
  import { getClient, IconWithEmoji } from '@hcengineering/presentation'
  import view from '@hcengineering/view'
  import card from '../../plugin'

  export let value: Ref<MasterTag>[]

  const client = getClient()
  const hierarchy = client.getHierarchy()

  function buildHierarchy (): NestedSelectItem[] {
    const rootTags = hierarchy.getDescendants(card.class.Card)
    const items: NestedSelectItem[] = []

    for (const id of rootTags) {
      const cls = hierarchy.getClass(id) as MasterTag
      if (
        cls.label === undefined ||
        cls.kind !== ClassifierKind.CLASS ||
        cls.removed === true ||
        cls.extends !== card.class.Card
      ) {
        continue
      }

      items.push({
        id: cls._id,
        label: cls.label,
        ...getIconProps(cls),
        children: getChildrenNodes(id)
      })
    }
    return items.sort((a, b) =>
      typeof a.label === 'string' && typeof b.label === 'string' ? a.label.localeCompare(b.label) : 0
    )
  }

  function getChildrenNodes (parentId: Ref<Class<Doc>>): NestedSelectItem[] {
    const descendants = hierarchy.getDescendants(parentId)
    const items: NestedSelectItem[] = []

    for (const id of descendants) {
      if (id === parentId) continue
      const cls = hierarchy.getClass(id) as MasterTag
      if (cls.label === undefined || cls.kind !== ClassifierKind.CLASS || cls.removed === true) continue

      items.push({
        id: cls._id,
        label: cls.label,
        ...getIconProps(cls),
        children: getChildrenNodes(id)
      })
    }
    return items.sort((a, b) =>
      typeof a.label === 'string' && typeof b.label === 'string' ? a.label.localeCompare(b.label) : 0
    )
  }

  function getIconProps (tag: MasterTag): { icon: any, iconProps: any } {
    return {
      icon: tag.icon === view.ids.IconWithEmoji ? IconWithEmoji : (tag.icon ?? card.icon.MasterTag),
      iconProps: tag.icon === view.ids.IconWithEmoji ? { icon: tag.color } : {}
    }
  }

  function openPopup (ev: MouseEvent): void {
    showPopup(
      NestedSelectPopup,
      {
        items: buildHierarchy(),
        selectedValues: value
      },
      getEventPositionElement(ev),
      undefined,
      (res) => {
        if (res !== undefined) {
          value = res
        }
      }
    )
  }
</script>

<Button kind={'regular'} size={'large'} justify={'left'} width={'min-content'} on:click={openPopup}>
  <svelte:fragment slot="content">
    {#if value?.length > 0}
      <div class="flex-row-center flex-nowrap pointer-events-none">
        <span class="label nowrap">
          <Label label={card.string.NumberTypes} params={{ count: value.length }} />
        </span>
      </div>
    {:else}
      <Label label={card.string.MasterTags} />
    {/if}
  </svelte:fragment>
</Button>
