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
  import { translate } from '@anticrm/platform'
  import { KeyedAttribute } from '@anticrm/presentation'
  import { TagElement, TagReference } from '@anticrm/tags'
  import { CircleButton, IconAdd, IconClose, Label, ShowMore, showPopup, Tooltip } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import tags from '../plugin'
  import TagItem from './TagItem.svelte'
  import TagsPopup from './TagsPopup.svelte'

  export let items: TagReference[] = []
  export let targetClass: Ref<Class<Doc>>
  export let key: KeyedAttribute
  export let showTitle = true
  export let elements: Map<Ref<TagElement>, TagElement>

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
        targetClass,
        title: keyLabel,
        addRef,
        selected: items.map((it) => it.tag)
      },
      evt.target as HTMLElement,
      async (result?: TagElement) => {
        if (result === null || result === undefined) {
          return
        }
        addRef(result)
      }
    )
  }

  async function removeTag (id: Ref<TagReference>): Promise<void> {
    dispatch('delete', id)
  }
</script>

<div class="flex-row">
  {#if showTitle}
    <div class="flex-row-center">
      <div class="title">
        <Label label={key.attr.label} />
      </div>
    </div>
  {/if}
  <ShowMore ignore={!showTitle}>
    <div class:tags-container={showTitle} class:mt-4={showTitle}>
      <div class="flex flex-reverse">
        <div id='add-tag' class="ml-4">
          <Tooltip label={tags.string.AddTagTooltip} props={{ word: keyLabel }}>
            <CircleButton icon={IconAdd} size={'small'} selected on:click={addTag} />
          </Tooltip>
        </div>
        <div class="tag-items" class:tag-items-scroll={!showTitle}>
          {#if items.length === 0}
          {#if keyLabel}
          <div class="flex flex-grow title-center">
            <Label label={tags.string.NoItems} params={{ word: keyLabel }} />
          </div>
          {/if}
          {/if}
          {#each items as tag}
          <TagItem
          {tag}
          element={elements.get(tag.tag)}
          action={IconClose}
          on:action={() => {
            removeTag(tag._id)
          }}
          />
          {/each}
        </div>
      </div>
    </div>
  </ShowMore>
</div>

<style lang="scss">
  .title {
    margin-right: 0.75rem;
    font-weight: 500;
    font-size: 1.25rem;
    color: var(--theme-caption-color);
  }
  .tags-container {
    padding: 1rem;
    color: var(--theme-caption-color);
    background: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: 0.75rem;
  }
  .tag-items {
    flex-grow: 1;
    display: flex;
    flex-wrap: wrap;
  }
  .tag-items-scroll {
    overflow-y: scroll;
    max-height: 10rem;
  }
  .title-center {
    align-items: center;
  }
</style>
