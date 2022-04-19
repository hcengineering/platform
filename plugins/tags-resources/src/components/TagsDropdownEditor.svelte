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
  import type { AttachedDoc, Class, Collection, Doc, Ref } from '@anticrm/core'
  import { IntlString, translate } from '@anticrm/platform'
  import { KeyedAttribute } from '@anticrm/presentation'
  import { TagElement, TagReference } from '@anticrm/tags'
  import type { ButtonKind, ButtonSize, TooltipAlignment } from '@anticrm/ui'
  import { Button, showPopup, Tooltip } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import tags from '../plugin'
  import TagsPopup from './TagsPopup.svelte'

  export let items: TagReference[] = []
  export let targetClass: Ref<Class<Doc>>
  export let key: KeyedAttribute
  export let elements: Map<Ref<TagElement>, TagElement>
  export let newElements: TagElement[] = []
  export let countLabel: IntlString

  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let labelDirection: TooltipAlignment | undefined = undefined

  const dispatch = createEventDispatcher()

  let keyLabel: string = ''

  $: itemLabel = (key.attr.type as Collection<AttachedDoc>).itemLabel

  $: translate(itemLabel ?? key.attr.label, {}).then((v) => {
    keyLabel = v
  })

  async function addRef (tag: TagElement): Promise<void> {
    dispatch('open', tag)
  }
  async function addTag (evt: Event): Promise<void> {
    showPopup(
      TagsPopup,
      {
        newElements,
        targetClass,
        selected: items.map((it) => it.tag),
        keyLabel
      },
      evt.target as HTMLElement,
      () => { },
      (result) => {
        if (result != undefined) {
          if (result.action === 'add') addRef(result.tag)
          else if (result.action === 'remove') removeTag(items.filter(it => it.tag === result.tag._id)[0]._id)
        }
      }
    )
  }

  async function removeTag (id: Ref<TagReference>): Promise<void> {
    dispatch('delete', id)
  }
</script>

<Tooltip label={key.attr.label} direction={labelDirection}>
  <Button
    icon={tags.icon.Tags}
    label={items.length > 0 ? undefined : key.attr.label}
    width={width ?? 'min-content'}
    {kind} {size} {justify}
    on:click={addTag}
  >
    <svelte:fragment slot="content">
      {#if items.length > 0}
        <div class="flex-row-center flex-nowrap">
          {#await translate(countLabel, { count: items.length }) then text}
            {text}
          {/await}
        </div>
      {/if}
    </svelte:fragment>
  </Button>
</Tooltip>
