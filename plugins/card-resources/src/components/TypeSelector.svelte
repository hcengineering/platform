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
  import { getFirstCreatableSubtype, getRootType, isBaseTypeWithSubtypes } from '../utils'

  export let value: Ref<MasterTag> | null
  export let width: string | undefined = undefined
  export let kind: ButtonKind | undefined = undefined
  export let size: ButtonSize | undefined = undefined
  export let parent: Ref<MasterTag> = card.class.Card
  export let disabled: boolean = false
  export let excludeBaseTypes: boolean = false
  export let allowedRootTypes: Ref<MasterTag>[] | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  function isAllowedBySpace (type: Ref<MasterTag>, roots: Ref<MasterTag>[] | undefined): boolean {
    return roots === undefined || roots.includes(getRootType(hierarchy, type))
  }

  function isSelectableClass (_class: Class<Doc>, roots: Ref<MasterTag>[] | undefined, skipBaseTypes: boolean): boolean {
    if (_class.label === undefined) return false
    if (_class.kind !== ClassifierKind.CLASS) return false
    if ((_class as MasterTag).removed === true) return false
    if (!isAllowedBySpace(_class._id as Ref<MasterTag>, roots)) return false
    if (skipBaseTypes && isBaseTypeWithSubtypes(hierarchy, _class._id as Ref<MasterTag>)) return false
    return true
  }

  function filterClasses (
    root: Ref<MasterTag>,
    roots: Ref<MasterTag>[] | undefined,
    skipBaseTypes: boolean
  ): [DropdownIntlItem, DropdownIntlItem[]][] {
    const descendants = hierarchy.getDescendants(root).filter((p) => p !== root)
    const added = new Set<Ref<Class<Doc>>>()
    const base = new Map<Ref<Class<Doc>>, Class<Doc>[]>()
    for (const _id of descendants) {
      if (added.has(_id)) continue
      const _class = hierarchy.getClass(_id)
      if (!isSelectableClass(_class, roots, skipBaseTypes)) continue
      added.add(_id)
      const descendants = hierarchy.getDescendants(_id)
      const toAdd: Class<Doc>[] = []
      for (const desc of descendants) {
        if (added.has(desc)) continue
        const _class = hierarchy.getClass(desc)
        if (!isSelectableClass(_class, roots, skipBaseTypes)) continue
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
      icon: tag.icon === view.ids.IconWithEmoji ? IconWithEmoji : (tag.icon ?? card.icon.MasterTag),
      iconProps: tag.icon === view.ids.IconWithEmoji ? { icon: tag.color } : {}
    }
  }

  let classes: [DropdownIntlItem, DropdownIntlItem[]][] = []
  $: classes = filterClasses(parent, allowedRootTypes, excludeBaseTypes)

  $: if (value != null && excludeBaseTypes && isBaseTypeWithSubtypes(hierarchy, value)) {
    const nextType = getFirstCreatableSubtype(hierarchy, value)
    if (nextType !== undefined) {
      value = nextType
      dispatch('change', value)
    }
  }

  $: if (value != null && !isAllowedBySpace(value, allowedRootTypes)) {
    value = null
    dispatch('change', value)
  }

  $: selectedClass = value != null ? hierarchy.getClass(value) : undefined
  $: selected =
    selectedClass !== undefined
      ? {
          id: selectedClass._id,
          label: selectedClass.label,
          ...getIconProps(selectedClass)
        }
      : undefined
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
