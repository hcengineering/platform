<!--
//
// Copyright © 2026 TraceX SAS.
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
    type DefaultDiscussion,
    defaultDiscussionVisibilityLevels,
    getEffectiveDefaultDiscussions
  } from '@hcengineering/chunter'
  import core, { type Class, type Doc, type ObjectVisibility, type Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { ButtonIcon, EditBox, Icon, IconAdd, IconCopy, IconDelete, Label } from '@hcengineering/ui'

  import chunter from '../../plugin'
  import DiscussionVisibilityMenu from './DiscussionVisibilityMenu.svelte'

  // A card type (MasterTag) or any other class whose objects have discussions.
  export let masterTag: Class<Doc>

  // Card collaborators by default.
  const DEFAULT_VISIBILITY: ObjectVisibility = 'participants'

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const query = createQuery()

  let items: DefaultDiscussion[] = []
  $: ancestors = hierarchy.getAncestors(masterTag._id)
  $: query.query(chunter.class.DefaultDiscussion, { ofClass: { $in: ancestors as Ref<Class<Doc>>[] } }, (result) => {
    items = result
  })
  $: inherited = getEffectiveDefaultDiscussions(items, ancestors).filter((item) => item.ofClass !== masterTag._id)
  $: owned = items.filter((item) => item.ofClass === masterTag._id)

  // A new default discussion is stored once it gets a name.
  let draftName: string | undefined = undefined
  // Re-renders the name editors to drop a rejected (empty) value.
  let resetKey = 0

  function addDraft (): void {
    draftName = ''
  }

  async function saveDraft (): Promise<void> {
    const name = (draftName ?? '').trim()
    draftName = undefined
    if (name === '') return
    await client.createDoc(chunter.class.DefaultDiscussion, core.space.Model, {
      ofClass: masterTag._id,
      name,
      visibility: DEFAULT_VISIBILITY
    })
  }

  // Existing discussions are renamed by the server, so the name cannot be empty.
  async function rename (item: DefaultDiscussion, value: string): Promise<void> {
    const name = value.trim()
    if (name === '') {
      resetKey++
      return
    }
    if (name !== item.name) await client.update(item, { name })
  }

  async function changeVisibility (item: DefaultDiscussion, visibility: ObjectVisibility): Promise<void> {
    if (visibility !== item.visibility) await client.update(item, { visibility })
  }

  let overriding = new Set<Ref<DefaultDiscussion>>()

  async function override (item: DefaultDiscussion): Promise<void> {
    // Guard against repeated clicks creating several overrides of the same configuration.
    if (overriding.has(item._id) || items.some((it) => it.overrides === item._id)) return
    overriding = new Set(overriding).add(item._id)
    try {
      await createOverride(item)
    } finally {
      overriding.delete(item._id)
      overriding = overriding
    }
  }

  async function createOverride (item: DefaultDiscussion): Promise<void> {
    await client.createDoc(chunter.class.DefaultDiscussion, core.space.Model, {
      ofClass: masterTag._id,
      name: item.name,
      visibility: item.visibility,
      overrides: item._id
    })
  }

  // Already created discussions stay as regular ones.
  async function remove (item: DefaultDiscussion): Promise<void> {
    await client.remove(item)
  }

  function blurOnEnter (event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault()
      ;(event.target as HTMLInputElement).blur()
    }
  }
</script>

<div class="hulyTableAttr-header font-medium-12">
  <Icon icon={chunter.icon.Thread} size="small" />
  <span><Label label={chunter.string.DefaultDiscussions} /></span>
  <ButtonIcon
    kind="primary"
    icon={IconAdd}
    size="small"
    dataId="btnAddDefaultDiscussion"
    tooltip={{ label: chunter.string.AddDefaultDiscussion }}
    disabled={draftName !== undefined}
    on:click={addDraft}
  />
</div>
<div class="content">
  <span class="description"><Label label={chunter.string.DefaultDiscussionsDescription} /></span>
  {#if inherited.length > 0 || owned.length > 0 || draftName !== undefined}
    <div class="list">
      {#each inherited as item (item._id)}
        <div class="row">
          <div class="name inherited">
            <span>{item.name}</span>
            <span class="source"
              ><Label label={chunter.string.InheritedDefaultDiscussion} />
              <Label label={hierarchy.getClass(item.ofClass).label} /></span
            >
          </div>
          <ButtonIcon
            icon={IconCopy}
            kind="tertiary"
            size="small"
            disabled={overriding.has(item._id)}
            tooltip={{ label: chunter.string.OverrideDefaultDiscussion }}
            on:click={() => void override(item)}
          />
        </div>
      {/each}
      {#key resetKey}
        {#each owned as item (item._id)}
          <div class="row">
            <div class="name">
              <EditBox
                value={item.name}
                placeholder={chunter.string.Topic}
                fullSize
                on:keydown={blurOnEnter}
                on:blur={(event) => void rename(item, event.detail ?? '')}
              />
            </div>
            <DiscussionVisibilityMenu
              value={item.visibility}
              parentClass={masterTag._id}
              levels={defaultDiscussionVisibilityLevels}
              kind="tertiary"
              size="small"
              on:change={(event) => void changeVisibility(item, event.detail)}
            />
            <ButtonIcon icon={IconDelete} kind="tertiary" size="small" on:click={() => void remove(item)} />
          </div>
        {/each}
      {/key}
      {#if draftName !== undefined}
        <div class="row">
          <div class="name">
            <EditBox
              bind:value={draftName}
              placeholder={chunter.string.Topic}
              fullSize
              autoFocus
              on:keydown={blurOnEnter}
              on:blur={() => void saveDraft()}
            />
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    padding: var(--spacing-1) var(--spacing-2) var(--spacing-2);
  }

  .description {
    color: var(--global-secondary-TextColor);
    font-size: 0.75rem;
    line-height: 1.125rem;
  }

  .list {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.75rem;
  }

  .row {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    min-height: 2.5rem;
    padding: 0.25rem 0.5rem 0.25rem 0.875rem;
    border-bottom: 1px solid var(--theme-divider-color);

    &:last-child {
      border-bottom: none;
    }
  }

  .name {
    display: flex;
    flex: 1;
    min-width: 0;
    font-size: 0.875rem;
  }

  .inherited {
    align-items: center;
    gap: var(--spacing-1);
  }

  .source {
    color: var(--global-secondary-TextColor);
    font-size: 0.75rem;
  }
</style>
