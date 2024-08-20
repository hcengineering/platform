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
  import core, { Class, Doc, DocumentQuery, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Issue } from '@hcengineering/tracker'
  import { Button, Chevron, ExpandCollapse, IconAdd, closeTooltip, resizeObserver, showPopup } from '@hcengineering/ui'
  import view, { ViewOptions, Viewlet, ViewletPreference } from '@hcengineering/view'
  import { ViewletsSettingButton, restrictionStore } from '@hcengineering/view-resources'
  import { afterUpdate } from 'svelte'
  import tracker from '../../../plugin'
  import CreateIssue from '../../CreateIssue.svelte'
  import SubIssueList from './SubIssueList.svelte'

  export let shouldSaveDraft: boolean = false
  export let object: Doc
  export let query: DocumentQuery<Issue> = {}

  export let createParams: Record<string, any> = {}
  export let viewletId = tracker.viewlet.SubIssues
  export let createLabel = tracker.string.AddIssue
  export let hasSubIssues = false

  let isCollapsed = false
  let listWidth: number

  let viewlet: Viewlet | undefined
  let viewOptions: ViewOptions | undefined
  export let focusIndex = -1

  function openNewIssueDialog (): void {
    showPopup(tracker.component.CreateIssue, { space: object.space, ...createParams, shouldSaveDraft }, 'top')
  }

  let lastIssueId: Ref<Doc>
  afterUpdate(() => {
    if (lastIssueId !== object._id) {
      lastIssueId = object._id
    }
  })

  const preferenceQuery = createQuery()
  const objectConfigurations = createQuery()
  let preference: ViewletPreference[] = []

  let configurationRaw: Viewlet[] = []
  let configurations: Record<Ref<Class<Doc>>, Viewlet['config']> = {}

  const client = getClient()

  $: viewlet &&
    objectConfigurations.query(
      view.class.Viewlet,
      {
        attachTo: { $in: client.getHierarchy().getDescendants(viewlet.attachTo) },
        descriptor: viewlet.descriptor,
        variant: viewlet.variant ? viewlet.variant : { $exists: false }
      },
      (res) => {
        configurationRaw = res
      }
    )

  $: viewlet &&
    preferenceQuery.query(
      view.class.ViewletPreference,
      {
        space: core.space.Workspace,
        attachedTo: { $in: configurationRaw.map((it) => it._id) }
      },
      (res) => {
        preference = res
      }
    )

  function updateConfiguration (configurationRaw: Viewlet[], preference: ViewletPreference[]): void {
    const newConfigurations: Record<Ref<Class<Doc>>, Viewlet['config']> = {}

    for (const v of configurationRaw) {
      newConfigurations[v.attachTo] = v.config
    }

    // Add viewlet configurations.
    for (const pref of preference) {
      if (pref.config.length > 0) {
        const viewlet = configurationRaw.find((it) => it._id === pref.attachedTo)
        if (viewlet !== undefined) {
          newConfigurations[viewlet.attachTo] = pref.config
        }
      }
    }

    configurations = newConfigurations
  }

  $: updateConfiguration(configurationRaw, preference)
</script>

<div class="flex-between mb-1">
  {#if hasSubIssues}
    {#if $$slots.header}
      <slot name="header" />
    {:else}
      <Button
        width="min-content"
        kind="ghost"
        on:click={() => {
          isCollapsed = !isCollapsed
        }}
      >
        <svelte:fragment slot="content">
          <Chevron
            size={'small'}
            expanded={!isCollapsed}
            outline
            fill={'var(--caption-color)'}
            marginRight={'.375rem'}
          />
          <slot name="chevron" />
        </svelte:fragment>
      </Button>
    {/if}
  {/if}
  <div class="flex-row-center gap-2 no-print">
    {#if hasSubIssues}
      <ViewletsSettingButton bind:viewOptions viewletQuery={{ _id: viewletId }} kind={'tertiary'} bind:viewlet />
    {/if}
    {#if hasSubIssues}
      <slot name="buttons" />
    {/if}
    {#if !$restrictionStore.readonly}
      <Button
        id="add-sub-issue"
        icon={IconAdd}
        label={hasSubIssues ? undefined : createLabel}
        labelParams={{ subIssues: 0 }}
        kind={'ghost'}
        showTooltip={{ label: createLabel, direction: 'bottom' }}
        on:click={() => {
          isCollapsed = false
          closeTooltip()
          openNewIssueDialog()
        }}
      />
    {/if}
  </div>
</div>
{#if hasSubIssues && viewOptions && viewlet}
  {#if !isCollapsed}
    <ExpandCollapse isExpanded={!isCollapsed}>
      <div
        class="list"
        class:collapsed={isCollapsed}
        use:resizeObserver={(evt) => {
          listWidth = evt.clientWidth
        }}
      >
        <SubIssueList
          createItemDialog={!$restrictionStore.readonly ? CreateIssue : undefined}
          createItemLabel={tracker.string.AddIssueTooltip}
          createItemDialogProps={{ space: object.space, ...createParams, shouldSaveDraft }}
          focusIndex={focusIndex === -1 ? -1 : focusIndex + 1}
          {configurations}
          {preference}
          {viewlet}
          {viewOptions}
          {query}
          compactMode={listWidth <= 600}
          on:docs
        />
      </div>
    </ExpandCollapse>
  {/if}
{/if}

<style lang="scss">
  .list {
    padding-top: 0.75rem;
    border-top: 1px solid var(--divider-color);

    &.collapsed {
      padding-top: 1px;
      border-top: none;
    }
  }
</style>
