<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { createEventDispatcher } from 'svelte'
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import tags, { TagReference } from '@hcengineering/tags'
  import { ButtonBase, ButtonKind, Icon, Label, getEventPopupPositionElement, showPopup } from '@hcengineering/ui'
  import tagsPlugin from '../plugin'
  import TagReferencePresenter from './TagReferencePresenter.svelte'
  import TagsEditorPopup from './TagsEditorPopup.svelte'
  import TagIcon from './icons/TagIcon.svelte'

  export let object: Doc
  export let targetClass: Ref<Class<Doc>>
  export let type: 'type-button-only' | 'type-content-only' = 'type-content-only'
  export let buttonParams: Record<string, any> = {}
  export let contentParams: Record<string, any> = {}

  const dispatch = createEventDispatcher()

  let items: TagReference[] = []
  let pressed: boolean = false
  const query = createQuery()
  const client = getClient()

  $: query.query(tags.class.TagReference, { attachedTo: object._id }, (result) => {
    items = result
  })

  async function click (evt: MouseEvent): Promise<void> {
    pressed = true
    showPopup(
      TagsEditorPopup,
      { object, targetClass },
      getEventPopupPositionElement(evt),
      () => {
        pressed = false
      },
      undefined,
      {
        refId: 'TagsPopup',
        category: 'popup',
        overlay: true
      }
    )
  }

  async function removeTag (tag: TagReference): Promise<void> {
    if (tag !== undefined) await client.remove(tag)
  }

  let count: number = 0
  $: updated(items)

  const updated = (its: TagReference[]): void => {
    if (count === its.length) return
    count = its.length
    dispatch('change', count)
  }
</script>

{#if type === 'type-button-only'}
  <ButtonBase
    icon={TagIcon}
    type={'type-button-icon'}
    kind={'secondary'}
    size={'small'}
    {pressed}
    hasMenu
    {...buttonParams}
    on:click={click}
  />
{/if}
{#if type === 'type-content-only'}
  {#if items.length}
    <div class="flex-row-center flex-wrap flex-gap-1-5">
      {#each items as value}
        <TagReferencePresenter
          attr={undefined}
          isEditable
          {value}
          kind={'todo'}
          {...contentParams}
          on:remove={(res) => removeTag(res.detail)}
        />
      {/each}
    </div>
  {/if}
{/if}

<style lang="scss">
  .step-container {
    margin: 0.375rem 0.375rem 0 0;
  }
</style>
