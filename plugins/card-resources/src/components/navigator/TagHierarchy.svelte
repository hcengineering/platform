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
  import { Class, Doc, Ref, Space } from '@hcengineering/core'
  import { IconWithEmoji, getClient } from '@hcengineering/presentation'
  import { NavItem, getCurrentLocation, navigate } from '@hcengineering/ui'
  import card from '../../plugin'
  import view from '@hcengineering/view'

  export let space: Ref<Space>
  export let classes: MasterTag[] = []
  export let allClasses: MasterTag[] = []
  export let _class: Ref<Class<Doc>> | undefined
  export let level: number = 0
  export let currentSpace: Ref<Space> | undefined

  const client = getClient()
  let descendants = new Map<Ref<Class<Doc>>, MasterTag[]>()

  function getDescendants (_class: Ref<MasterTag>): MasterTag[] {
    const hierarchy = client.getHierarchy()
    const result: MasterTag[] = []
    const desc = hierarchy.getDescendants(_class)
    for (const clazz of desc) {
      const cls = hierarchy.getClass(clazz) as MasterTag
      if (cls.extends === _class && cls._class === card.class.MasterTag && cls.removed !== true) {
        result.push(cls)
      }
    }
    return result.sort((a, b) => a.label.localeCompare(b.label))
  }

  function fillDescendants (classes: MasterTag[]): void {
    for (const cl of classes) {
      descendants.set(cl._id, getDescendants(cl._id))
    }
    descendants = descendants
  }

  $: fillDescendants(allClasses)

  function select (clazz: Ref<Class<Doc>>, space: Ref<Space>): void {
    const loc = getCurrentLocation()
    loc.path[3] = space
    loc.path[4] = clazz
    loc.path.length = 5
    navigate(loc)
  }
</script>

{#each classes as clazz}
  <NavItem
    _id={clazz._id}
    label={clazz.label}
    icon={clazz.icon === view.ids.IconWithEmoji ? IconWithEmoji : clazz.icon}
    iconProps={clazz.icon === view.ids.IconWithEmoji ? { icon: clazz.color } : {}}
    isFold
    empty={(descendants.get(clazz._id)?.length ?? 0) === 0}
    {level}
    selected={clazz._id === _class && currentSpace === space}
    on:click={() => {
      select(clazz._id, space)
    }}
  >
    <svelte:fragment slot="dropbox">
      {#if (descendants.get(clazz._id)?.length ?? 0) > 0}
        <svelte:self
          classes={descendants.get(clazz._id) ?? []}
          {space}
          {currentSpace}
          {_class}
          {allClasses}
          level={level + 1}
          on:select
        />
      {/if}
    </svelte:fragment>
  </NavItem>
{/each}
