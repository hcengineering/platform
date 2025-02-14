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
  import { createQuery, getClient } from '@hcengineering/presentation'
  import {
    ButtonIcon,
    CircleButton,
    IconAdd,
    IconClose,
    Label,
    showPopup,
    SelectPopup,
    SelectPopupValueType,
    eventToHTMLElement,
    ScrollerBar
  } from '@hcengineering/ui'
  import MasterTagSelector from './MasterTagSelector.svelte'
  import { fillDefaults } from '@hcengineering/core'

  export let doc: Card

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
  $: possibleMixins = tags.filter(
    (p) =>
      !hierarchy.hasMixin(doc, p._id) &&
      (hierarchy.isDerived(p._id, doc._class) || ancestors.includes(hierarchy.getBaseClass(p._id)))
  )
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
          const updated = fillDefaults(hierarchy, hierarchy.clone(doc), res)
          await client.diffUpdate(doc, updated)
        }
      }
    )
  }

  let divScroll: HTMLElement
</script>

<div class="container py-4 gap-2">
  <MasterTagSelector value={doc} />
  {#if activeTags.length > 0 || dropdownItems.length > 0}
    <div class="divider" />
    <ScrollerBar gap={'none'} bind:scroller={divScroll}>
      <div class="tags gap-2">
        {#each activeTags as mixin}
          <div class="tag no-word-wrap">
            <Label label={mixin.label} />
            <ButtonIcon icon={IconClose} size="extra-small" kind="tertiary" on:click={() => removeTag(mixin._id)} />
          </div>
        {/each}
        {#if dropdownItems.length > 0}
          <CircleButton icon={IconAdd} size="small" ghost on:click={add} />
        {/if}
      </div>
    </ScrollerBar>
  {/if}
</div>

<style lang="scss">
  .container,
  .tags {
    display: flex;
    align-items: center;

    .tag {
      padding: 0.25rem 0.25rem 0.25rem 0.5rem;
      height: 1.5rem;
      border: 1px solid var(--theme-content-color);

      border-radius: 6rem;

      color: var(--theme-caption-color);

      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
    }
  }

  .divider {
    border: 1px solid var(--theme-content-color);
    width: 1px;
    height: 100%;
    margin-left: 0.5rem;
  }
</style>
