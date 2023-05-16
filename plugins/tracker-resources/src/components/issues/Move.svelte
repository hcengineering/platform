<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2023 Hardcore Engineering Inc.
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
  import { DocumentUpdate, Ref } from '@hcengineering/core'
  import { SpaceSelect, createQuery, getClient, statusStore } from '@hcengineering/presentation'
  import { Component, Issue, Project } from '@hcengineering/tracker'
  import ui, { Button, Label, Spinner } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import { collectIssues, findTargetStatus, moveIssueToSpace } from '../../utils'
  import IssuePresenter from './IssuePresenter.svelte'
  import TitlePresenter from './TitlePresenter.svelte'
  import ComponentMove from './move/ComponentMove.svelte'
  import ComponentMovePresenter from './move/ComponentMovePresenter.svelte'
  import StatusMove from './move/StatusMove.svelte'
  import StatusMovePresenter from './move/StatusMovePresenter.svelte'

  export let selected: Issue | Issue[]
  $: docs = Array.isArray(selected) ? selected : [selected]

  let currentSpace: Project | undefined
  const client = getClient()
  const dispatch = createEventDispatcher()
  const hierarchy = client.getHierarchy()
  let space: Ref<Project>

  $: _class = hierarchy.getClass(tracker.class.Project).label
  $: {
    const doc = docs[0]
    if (space === undefined) {
      space = doc.space
    }
  }

  let processing = false

  const moveAll = async () => {
    if (currentSpace === undefined) {
      return
    }
    processing = true
    await moveIssueToSpace(client, docs, currentSpace, issueToUpdate)
    processing = false
    dispatch('close')
  }

  const targetSpaceQuery = createQuery()

  let issueToUpdate: Map<Ref<Issue>, DocumentUpdate<Issue>> = new Map()

  $: targetSpaceQuery.query(tracker.class.Project, { _id: space }, (res) => {
    ;[currentSpace] = res
  })

  let toMove: Issue[] = []
  let loading = true
  $: {
    collectIssues(client, docs).then((res) => {
      toMove = res
      loading = false
    })
  }

  $: if (currentSpace !== undefined) {
    for (const c of toMove) {
      const upd = issueToUpdate.get(c._id) ?? {}

      // In case of target space change
      if (upd.status !== undefined && $statusStore.get(upd.status)?.space !== currentSpace._id) {
        upd.status = undefined
      }
      if (upd.status === undefined) {
        upd.status = findTargetStatus($statusStore, c.status, space, true) ?? currentSpace.defaultIssueStatus
      }

      if (c.component !== undefined) {
        const cur = components.find((it) => it._id === c.component)

        if (cur !== undefined) {
          if (
            upd.component !== undefined &&
            components.find((it) => it._id === upd.component)?.space !== currentSpace._id
          ) {
            upd.component = undefined
          }
          if (upd.component === undefined) {
            upd.component = components.find((it) => it.space === currentSpace?._id && it.label === cur.label)?._id
          }
        }
      }
      if (c.attachedTo !== tracker.ids.NoParent && toMove.find((it) => it._id === c.attachedTo) === undefined) {
        upd.attachedTo = tracker.ids.NoParent
        upd.attachedToClass = tracker.class.Issue
      }
      issueToUpdate.set(c._id, upd)
    }
    issueToUpdate = issueToUpdate
  }

  const componentQuery = createQuery()
  let components: Component[] = []

  $: componentQuery.query(tracker.class.Component, {}, (res) => {
    components = res
  })
</script>

<div class="container">
  <div class="overflow-label fs-title">
    <Label label={tracker.string.MoveIssues} />
  </div>
  <div class="caption-color mt-4 mb-4">
    <Label label={tracker.string.MoveIssuesDescription} />
  </div>
  <div class="spaceSelect">
    {#if currentSpace && _class}
      <SpaceSelect _class={currentSpace._class} label={_class} bind:value={space} />
    {/if}
  </div>
  <div class="mt-2">
    <Label label={tracker.string.Issues} />
  </div>
  <div class="issues-move flex-col">
    {#if loading}
      <Spinner />
    {:else if toMove.length > 0 && currentSpace}
      {#each toMove as issue}
        {@const upd = issueToUpdate.get(issue._id) ?? {}}
        <div class="issue-move p-3">
          <div class="flex-row-center p-1">
            <IssuePresenter value={issue} disabled kind={'list'} />
            <div class="ml-2 max-w-30">
              <TitlePresenter disabled value={issue} showParent={false} />
            </div>
          </div>
          {#if issue.space !== currentSpace._id}
            {#key upd.status}
              <StatusMovePresenter {issue} {issueToUpdate} currentProject={currentSpace} />
            {/key}
            {#key upd.component}
              <ComponentMovePresenter {issue} {issueToUpdate} currentProject={currentSpace} {components} />
            {/key}
            {#if upd.attachedTo === tracker.ids.NoParent && issue.attachedTo !== tracker.ids.NoParent}
              <div class="p-1 unset-parent">
                <Label label={tracker.string.SetParent} />
              </div>
            {/if}
          {/if}
        </div>
      {/each}
    {/if}
  </div>

  {#if currentSpace !== undefined}
    <StatusMove issues={toMove} targetProject={currentSpace} />
    <ComponentMove issues={toMove} targetProject={currentSpace} {components} />
  {/if}

  <div class="footer">
    <Button
      label={view.string.Move}
      size={'small'}
      disabled={docs[0]?.space === currentSpace?._id}
      kind={'primary'}
      on:click={moveAll}
      loading={processing}
    />
    <Button
      size={'small'}
      label={ui.string.Cancel}
      on:click={() => {
        dispatch('close')
      }}
      disabled={processing}
    />
  </div>
</div>

<style lang="scss">
  .container {
    display: flex;
    flex-direction: column;
    padding: 2rem 1.75rem 1.75rem;
    width: 55rem;
    max-width: 40rem;
    background: var(--popup-bg-color);
    border-radius: 1.25rem;
    user-select: none;
    box-shadow: var(--popup-shadow);

    .spaceSelect {
      padding: 0.75rem;
      background-color: var(--body-color);
      border: 1px solid var(--popup-divider);
      border-radius: 0.75rem;
    }

    .footer {
      flex-shrink: 0;
      display: grid;
      grid-auto-flow: column;
      direction: rtl;
      justify-content: start;
      align-items: center;
      margin-top: 1rem;
      column-gap: 0.5rem;
    }
    .issues-move {
      height: 30rem;
      overflow: auto;
    }
    .issue-move {
      border: 1px solid var(--popup-divider);
    }

    .status-option {
      border: 1px solid var(--popup-divider);
    }
  }

  .unset-parent {
    background-color: var(--accent-bg-color);
  }
</style>
