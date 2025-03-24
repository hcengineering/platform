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
  import cardPlugin, { MasterTag } from '@hcengineering/card'
  import core, { Class, ClassifierKind, Doc, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Icon, IconWithEmoji, Label } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'

  export let classes: Ref<Class<Doc>>[] = []
  export let _class: Ref<Class<Doc>> | undefined
  export let kind: ClassifierKind = ClassifierKind.CLASS
  export let level: number = 0

  const client = getClient()
  const dispatch = createEventDispatcher()
  let descendants = new Map<Ref<Class<Doc>>, Ref<Class<Doc>>[]>()

  function getDescendants (_class: Ref<Class<Doc>>): Ref<Class<Doc>>[] {
    const hierarchy = client.getHierarchy()
    const result: Ref<Class<Doc>>[] = []
    const desc = hierarchy.getDescendants(_class)
    for (const clazz of desc) {
      const cls = hierarchy.getClass(clazz)
      if (cls.extends === _class && !cls.hidden && kind === cls.kind && cls.label !== undefined) {
        result.push(clazz)
      }
    }
    return result
  }

  function fillDescendants (classes: Ref<Class<Doc>>[]): void {
    for (const cl of classes) {
      descendants.set(cl, getDescendants(cl))
    }
    descendants = descendants
  }

  const query = createQuery()
  query.query(core.class.Class, {}, () => {
    fillDescendants(classes)
  })

  $: fillDescendants(classes)

  function getMasterTag (cl: Ref<Class<Doc>>): MasterTag {
    return client.getHierarchy().getClass(cl) as MasterTag
  }
</script>

{#each classes as cl}
  {@const clazz = getMasterTag(cl)}
  <button
    class="hulyTableAttr-content__row justify-start cursor-pointer"
    on:click={() => {
      dispatch('select', cl)
    }}
  >
    <div
      class="hulyTableAttr-content__row-label font-medium-14 flex flex-gap-2"
      style:margin-left={`${level * 1.25}rem`}
    >
      <Icon
        icon={clazz.icon === view.ids.IconWithEmoji ? IconWithEmoji : clazz.icon ?? cardPlugin.icon.Tag}
        iconProps={clazz.icon === view.ids.IconWithEmoji ? { icon: clazz.color, size: 'small' } : {}}
        size="small"
      />
      <Label label={clazz.label} />
    </div>
  </button>
  {#if (descendants.get(cl)?.length ?? 0) > 0}
    <svelte:self classes={descendants.get(cl) ?? []} {_class} {kind} level={level + 1} on:select />
  {/if}
{/each}
