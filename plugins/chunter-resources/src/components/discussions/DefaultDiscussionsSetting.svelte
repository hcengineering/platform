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
  import { ButtonIcon, EditBox, Icon, IconAdd, IconDelete, Label } from '@hcengineering/ui'

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
{#if inherited.length > 0 || owned.length > 0 || draftName !== undefined}
  <div class="hulyTableAttr-content task">
    {#each inherited as item (item._id)}
      <div class="hulyTableAttr-content__row row justify-start">
        <div class="hulyTableAttr-content__row-label font-medium-14 name">
          <span>{item.name}</span>
        </div>
        <span class="source"
          ><Label label={chunter.string.InheritedDefaultDiscussion} />
          <Label label={hierarchy.getClass(item.ofClass).label} /></span
        >
      </div>
    {/each}
    {#key resetKey}
      {#each owned as item (item._id)}
        <div class="hulyTableAttr-content__row row justify-start">
          <div class="hulyTableAttr-content__row-label font-medium-14 name">
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
      <div class="hulyTableAttr-content__row row justify-start">
        <div class="hulyTableAttr-content__row-label font-medium-14 name">
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

<style lang="scss">
  .hulyTableAttr-content.task > .row {
    padding-top: 0.25rem;
    padding-bottom: 0.25rem;
  }

  .name {
    flex: 1;
    min-width: 0;
  }

  .source {
    flex-shrink: 0;
    white-space: nowrap;
    color: var(--global-secondary-TextColor);
    font-size: 0.75rem;
  }
</style>
