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
  import { type Discussion } from '@hcengineering/chunter'
  import { type Doc, type Ref, type WithLookup } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Button, ButtonIcon, IconAdd, Label, Section, showPopup } from '@hcengineering/ui'
  import { type Viewlet, type ViewletPreference, type ViewOptions } from '@hcengineering/view'
  import {
    List,
    ListSelectionProvider,
    permissions,
    type SelectDirection,
    ViewletsSettingButton
  } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'

  import chunter from '../../plugin'
  import { canCreateDiscussion } from '../../utils'
  import CreateDiscussion from './CreateDiscussion.svelte'

  export let doc: Doc
  export let readonly: boolean = false
  export let hidden: boolean = false

  const dispatch = createEventDispatcher()
  const discussionsQuery = createQuery()
  let discussions: Discussion[] = []
  let viewlet: WithLookup<Viewlet> | undefined
  let preference: ViewletPreference | undefined
  let viewOptions: ViewOptions | undefined
  let list: List
  const listProvider = new ListSelectionProvider(
    (offset: 1 | -1 | 0, of?: Doc, direction?: SelectDirection, noScroll?: boolean) => {
      if (direction === 'vertical') list?.select(offset, of, noScroll)
    }
  )
  const selection = listProvider.selection

  $: config = preference?.config ?? viewlet?.config ?? []

  $: discussionsQuery.query(chunter.class.Discussion, { attachedTo: doc._id }, (result) => {
    discussions = result
    dispatch('loaded')
  })

  $: canCreate = canCreateDiscussion() && $permissions.canComment(doc)

  function createDiscussion (): void {
    showPopup(CreateDiscussion, { object: doc }, 'top', (result?: Ref<Discussion>) => {
      if (result != null) openDiscussion(result)
    })
  }

  function handleOpenDiscussion (discussion: Discussion): void {
    openDiscussion(discussion._id)
  }

  // The owner panel shows the discussion in its aside, so it closes together with the object.
  function openDiscussion (discussionId: Ref<Discussion>): void {
    dispatch('action', {
      id: 'aside',
      component: chunter.component.DiscussionAside,
      props: { discussionId }
    })
  }
</script>

{#if !hidden}
  <div class="discussions-section">
    <Section label={chunter.string.Discussions} icon={chunter.icon.Thread} counter={discussions.length}>
      <div slot="header" class="buttons-group small-gap">
        <ViewletsSettingButton
          bind:viewOptions
          bind:viewlet
          bind:preference
          viewletQuery={{ _id: chunter.viewlet.DiscussionList }}
          kind="tertiary"
        />
        {#if !readonly && canCreate}
          <ButtonIcon
            icon={IconAdd}
            kind="tertiary"
            size="small"
            tooltip={{ label: chunter.string.NewDiscussion }}
            on:click={createDiscussion}
          />
        {/if}
      </div>

      <svelte:fragment slot="content">
        {#if discussions.length === 0}
          <div class="antiSection-empty flex-col mt-3">
            <span class="text-sm content-dark-color"><Label label={chunter.string.NoDiscussionsYet} /></span>
            {#if !readonly && canCreate}
              <Button kind="link" size="small" label={chunter.string.NewDiscussion} on:click={createDiscussion} />
            {/if}
          </div>
        {:else if viewlet !== undefined && viewOptions !== undefined}
          <div class="mt-3">
            {#key doc._id}
              <List
                bind:this={list}
                _class={chunter.class.Discussion}
                query={{ attachedTo: doc._id }}
                {config}
                {viewOptions}
                viewOptionsConfig={viewlet.viewOptions?.other}
                options={viewlet.options}
                {listProvider}
                {readonly}
                configurations={undefined}
                selectedObjectIds={$selection ?? []}
                disableHeader
                flatHeaders
                singleCategoryLimit={3}
                props={{ ...viewlet.props, onOpenDiscussion: handleOpenDiscussion }}
                on:row-focus={(event) => listProvider.updateFocus(event.detail ?? undefined)}
                on:check={(event) => listProvider.updateSelection(event.detail.docs, event.detail.value)}
                on:content={(event) => listProvider.update(event.detail)}
              />
            {/key}
          </div>
        {/if}
      </svelte:fragment>
    </Section>
  </div>
{/if}

<style lang="scss">
  .discussions-section {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 0 1rem;
  }
</style>
