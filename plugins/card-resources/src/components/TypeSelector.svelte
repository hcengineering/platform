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
  import { MasterTag } from '@hcengineering/card'
  import { Class, ClassifierKind, Doc, Ref } from '@hcengineering/core'
  import { getClient, IconWithEmoji } from '@hcengineering/presentation'
  import { type ButtonKind, type ButtonSize, DropdownIntlItem, NestedDropdown } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import card from '../plugin'
  import view from '@hcengineering/view'

  export let value: Ref<MasterTag>
  export let width: string | undefined = undefined
  export let kind: ButtonKind | undefined = undefined
  export let size: ButtonSize | undefined = undefined
  export let disabled: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()

  function filterClasses (): [DropdownIntlItem, DropdownIntlItem[]][] {
    const descendants = hierarchy.getDescendants(card.class.Card).filter((p) => p !== card.class.Card)
    const added = new Set<Ref<Class<Doc>>>()
    const base = new Map<Ref<Class<Doc>>, Class<Doc>[]>()
    for (const _id of descendants) {
      if (added.has(_id)) continue
      const _class = hierarchy.getClass(_id)
      if (_class.label === undefined) continue
      if (_class.kind !== ClassifierKind.CLASS) continue
      if ((_class as MasterTag).removed === true) continue
      added.add(_id)
      const descendants = hierarchy.getDescendants(_id)
      const toAdd: Class<Doc>[] = []
      for (const desc of descendants) {
        if (added.has(desc)) continue
        const _class = hierarchy.getClass(desc)
        if (_class.label === undefined) continue
        if (_class.kind !== ClassifierKind.CLASS) continue
        if ((_class as MasterTag).removed === true) continue
        added.add(desc)
        toAdd.push(_class)
      }
      base.set(_id, toAdd)
    }
    const result: [DropdownIntlItem, DropdownIntlItem[]][] = []
    for (const [key, value] of base) {
      try {
        const clazz = hierarchy.getClass(key)
        result.push([
          { id: key, label: clazz.label, ...getIconProps(clazz) },
          value
            .map((it) => ({ id: it._id, label: it.label, ...getIconProps(it) }))
            .sort((a, b) => a.label.localeCompare(b.label))
        ])
      } catch {}
    }
    return result
  }

  function getIconProps (tag: MasterTag): Pick<DropdownIntlItem, 'icon' | 'iconProps'> {
    return {
      icon: tag.icon === view.ids.IconWithEmoji ? IconWithEmoji : tag.icon ?? card.icon.MasterTag,
      iconProps: tag.icon === view.ids.IconWithEmoji ? { icon: tag.color } : {}
    }
  }

  const classes = filterClasses()
  const dispatch = createEventDispatcher()

  $: selectedClass = hierarchy.getClass(value)
  $: selected = {
    id: selectedClass._id,
    label: selectedClass.label,
    ...getIconProps(selectedClass)
  }
</script>

<NestedDropdown
  items={classes}
  {width}
  {selected}
  {kind}
  {size}
  {disabled}
  withIcon={true}
  withSelectIcon={false}
  withSearch={true}
  disableFocusOnMouseover={true}
  on:selected={(e) => {
    value = e.detail
    dispatch('change', value)
  }}
/>
