<!--
//
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
//
-->
<script lang="ts">
  import card, { Card, Tag } from '@hcengineering/card'
  import { Class, Doc, Mixin, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import {
    ButtonIcon,
    CircleButton,
    eventToHTMLElement,
    IconAdd,
    IconClose,
    IconDownOutline,
    Label,
    SelectPopup,
    showPopup,
    tooltip
  } from '@hcengineering/ui'
  import MasterTagSelector from './MasterTagSelector.svelte'

  export let doc: Card
  export let dropdownTags: boolean = false
  export let id: string | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let tags: Tag[] = []
  const query = createQuery()
  query.query(card.class.Tag, {}, (result) => {
    tags = result
  })

  $: activeTags = tags.filter((tag) => hierarchy.hasMixin(doc, tag._id))

  async function removeTag (tagId: string): Promise<void> {
    await client.update(doc, { $unset: { [tagId]: true } })
  }

  $: ancestors = hierarchy.getAncestors(doc._class)
  $: possibleMixins = getPossibleMixins(doc._class, tags)

  function getPossibleMixins (_class: Ref<Class<Doc>>, tags: Tag[]): Tag[] {
    const res: Tag[] = []
    for (const p of tags) {
      try {
        if (hierarchy.hasMixin(doc, p._id)) continue
        const base = hierarchy.getBaseClass(p._id)
        if (_class === base || ancestors.includes(base)) {
          res.push(p)
        }
      } catch (err) {
        console.log('error', err, p._id)
      }
    }
    return res
  }
  $: dropdownItems = possibleMixins.map((mixin) => ({ id: mixin._id, label: mixin.label }))
  function add (e: MouseEvent): void {
    showPopup(
      SelectPopup,
      {
        value: dropdownItems
      },
      eventToHTMLElement(e),
      async (res) => {
        if (res !== undefined) {
          await client.createMixin(doc._id, doc._class, doc.space, res, {})
        }
      }
    )
  }

  function isRemoveable (mixinId: Ref<Mixin<Doc>>, activeTags: Tag[]): boolean {
    const desc = hierarchy.getDescendants(mixinId)
    return !desc.some((p) => hierarchy.hasMixin(doc, p) && p !== mixinId)
  }

  const handleDrop = (e: MouseEvent): void => {
    e.stopPropagation()
    e.preventDefault()
    if (activeTags.length === 0) return
    const value = activeTags.map((mixin) => ({ id: mixin._id, label: mixin.label, isSelected: true }))
    if (possibleMixins.length > 0) {
      value.push(...possibleMixins.map((mixin) => ({ id: mixin._id, label: mixin.label, isSelected: false })))
    }
    showPopup(SelectPopup, { value }, eventToHTMLElement(e), async (result) => {
      if (result === undefined) return
      const selected = value.find((v) => v.id === result)
      if (selected === undefined) return
      if (selected.isSelected) {
        await removeTag(selected.id as Ref<Mixin<Card>>)
      } else {
        await client.createMixin(doc._id, doc._class, doc.space, selected.id as Ref<Mixin<Card>>, {})
      }
    })
  }
</script>

<div class="container gap-1">
  <MasterTagSelector value={doc} />
  {#if activeTags.length > 0 || dropdownItems.length > 0}
    <div class="divider" />
    <div class="tags p-1 gap-1">
      {#if dropdownTags && activeTags.length > 0}
        <CircleButton
          id={id ? `${id}-dropdown` : undefined}
          icon={IconDownOutline}
          size={'small'}
          on:click={handleDrop}
        />
      {:else}
        {#each activeTags as mixin}
          {@const removable = isRemoveable(mixin._id, activeTags)}
          <div class="tag no-word-wrap" class:removable use:tooltip={{ label: mixin.label }}>
            <span class="overflow-label">
              <Label label={mixin.label} />
            </span>
            {#if removable}
              <ButtonIcon icon={IconClose} size="extra-small" kind="tertiary" on:click={() => removeTag(mixin._id)} />
            {/if}
          </div>
        {/each}
        {#if dropdownItems.length > 0}
          <CircleButton id={id ? `${id}-add` : undefined} icon={IconAdd} size={'small'} ghost on:click={add} />
        {/if}
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .container,
  .tags {
    display: flex;
    align-items: center;
    flex-shrink: 1;
    min-width: 0;

    .tag {
      padding: 0.25rem 0.5rem;
      height: 1.5rem;
      border: 1px solid var(--theme-content-color);
      max-width: 12.5rem;
      min-width: 2rem;
      overflow: hidden;
      border-radius: 6rem;

      color: var(--theme-caption-color);

      display: flex;
      align-items: center;
      flex-shrink: 2;
      gap: 0.25rem;

      &.removable {
        padding-right: 0.25rem;
        min-width: 3.75rem;
      }
    }
  }

  .divider {
    border: 1px solid var(--theme-content-color);
    width: 1px;
    height: 100%;
    margin-left: 0.25rem;
  }
</style>
