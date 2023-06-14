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
  import { createEventDispatcher } from 'svelte'

  import { Ref } from '@hcengineering/core'
  import { SpaceSelector, createQuery, getClient } from '@hcengineering/presentation'
  import { Component, Issue, IssueStatus, Project } from '@hcengineering/tracker'
  import ui, { Button, IconClose, Label, Spinner } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { statusStore } from '@hcengineering/view-resources'
  import { getEmbeddedLabel } from '@hcengineering/platform'

  import tracker from '../../plugin'
  import { IssueToUpdate, collectIssues, findTargetStatus, moveIssueToSpace } from '../../utils'
  import ProjectPresenter from '../projects/ProjectPresenter.svelte'
  import IssuePresenter from './IssuePresenter.svelte'
  import TitlePresenter from './TitlePresenter.svelte'
  import ComponentMove from './move/ComponentMove.svelte'
  import ComponentMovePresenter from './move/ComponentMovePresenter.svelte'
  import StatusMove from './move/StatusMove.svelte'
  import StatusMovePresenter from './move/StatusMovePresenter.svelte'
  import SelectReplacement from './move/SelectReplacement.svelte'
  import PriorityEditor from './PriorityEditor.svelte'

  export let selected: Issue | Issue[]
  $: docs = Array.isArray(selected) ? selected : [selected]

  const client = getClient()
  const dispatch = createEventDispatcher()
  const hierarchy = client.getHierarchy()

  let currentSpace: Project | undefined
  let space: Ref<Project>

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
    for (const c of toMove) {
      const upd = issueToUpdate.get(c._id) ?? {}

      if (c.status !== undefined && !upd.useStatus) {
        const newStatus = statusToUpdate[c.status]
        if (newStatus !== undefined) {
          upd.status = newStatus
        }
      }

      if (c.component !== undefined && c.component !== null && !upd.useComponent) {
        const newComponent = componentToUpdate[c.component]
        if (newComponent !== undefined) {
          upd.component = newComponent
        }
      }

      issueToUpdate.set(c._id, upd)
    }

    await moveIssueToSpace(client, docs, currentSpace, issueToUpdate)
    processing = false
    dispatch('close')
  }

  const targetSpaceQuery = createQuery()

  let issueToUpdate: Map<Ref<Issue>, IssueToUpdate> = new Map()
  let statusToUpdate: Record<Ref<IssueStatus>, Ref<IssueStatus> | undefined> = {}
  let componentToUpdate: Record<Ref<Component>, Ref<Component> | undefined> = {}

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

  const keepOriginalAttribytes: boolean = false
  let showManageAttributes: boolean = false
  $: isManageAttributesAvailable = issueToUpdate.size > 0 && docs[0]?.space !== currentSpace?._id
</script>

<div class="container">
  {#if !showManageAttributes}
    <div class="space-between">
      <span class="fs-title aligned-text">
        <Label label={tracker.string.MoveIssues} />
      </span>
      <Button icon={IconClose} iconProps={{ size: 'medium' }} kind="transparent" on:click={() => dispatch('close')} />
    </div>

    <div>
      <Label label={tracker.string.MoveIssuesDescription} />
    </div>

    <div class="space-between mt-6 mb-4">
      {#if currentSpace !== undefined}
        <SpaceSelector
          _class={currentSpace._class}
          label={hierarchy.getClass(tracker.class.Project).label}
          bind:space
          kind={'secondary'}
          size={'small'}
          component={ProjectPresenter}
          iconWithEmojii={tracker.component.IconWithEmojii}
          defaultIcon={tracker.icon.Home}
        />
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <span
          class="aligned-text"
          class:disabled={!isManageAttributesAvailable}
          class:link={!keepOriginalAttribytes}
          on:click|stopPropagation={() => {
            if (!isManageAttributesAvailable) {
              return
            }
            showManageAttributes = !showManageAttributes
          }}
        >
          Manage attributes >
        </span>
      {/if}
    </div>

    <div class="divider" />
    {#if currentSpace !== undefined && !keepOriginalAttribytes}
      <SelectReplacement
        {components}
        targetProject={currentSpace}
        issues={toMove}
        bind:statusToUpdate
        bind:componentToUpdate
      />
      <div class="divider" />
    {/if}
  {:else}
    <div class="space-between pb-4">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <span
        class="fs-title aligned-text"
        on:click|stopPropagation={() => (showManageAttributes = !showManageAttributes)}
      >
        <Label label={getEmbeddedLabel('<    Manage attributes')} />
      </span>
      <Button icon={IconClose} iconProps={{ size: 'medium' }} kind="transparent" on:click={() => dispatch('close')} />
    </div>
    <div class="divider" />

    <div class="issues-move flex-col">
      {#if loading}
        <Spinner />
      {:else if toMove.length > 0 && currentSpace}
        {#each toMove as issue}
          {@const upd = issueToUpdate.get(issue._id) ?? {}}
          {#if issue.space !== currentSpace._id && (upd.status !== undefined || upd.component !== undefined)}
            <div class="issue-move pb-2">
              <div class="flex-row-center pl-1">
                <PriorityEditor value={issue} isEditable={false} />
                <IssuePresenter value={issue} disabled kind={'list'} />
                <div class="ml-2 max-w-30">
                  <TitlePresenter disabled value={issue} showParent={false} />
                </div>
              </div>
              <div class="pl-4">
                {#key upd.status}
                  <StatusMovePresenter {issue} bind:issueToUpdate currentProject={currentSpace} />
                {/key}
                {#key upd.component}
                  <ComponentMovePresenter {issue} bind:issueToUpdate currentProject={currentSpace} {components} />
                {/key}
              </div>
            </div>
          {/if}
        {/each}
      {/if}
    </div>

    {#if currentSpace !== undefined}
      <StatusMove issues={toMove} targetProject={currentSpace} />
      <ComponentMove issues={toMove} targetProject={currentSpace} {components} />
    {/if}
  {/if}

  <div class="space-between mt-4">
    <!-- <div
      class="aligned-text"
      use:tooltip={{
        component: Label,
        props: { label: tracker.string.KeepOriginalAttributesTooltip }
      }}
    >
      <div class="mr-2"><Toggle bind:on={keepOriginalAttribytes} /></div>
      <Label label={tracker.string.KeepOriginalAttributes} />
    </div> -->
    <div class="buttons">
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
</div>

<style lang="scss">
  .container {
    display: flex;
    flex-direction: column;
    padding: 1.25rem 1.5rem 1rem;
    width: 480px;
    max-width: 40rem;
    background: var(--popup-bg-color);
    border-radius: 8px;
    user-select: none;

    .aligned-text {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .space-between {
      display: flex;
      justify-content: space-between;
    }

    .buttons {
      flex-shrink: 0;
      display: grid;
      grid-auto-flow: column;
      direction: rtl;
      justify-content: start;
      align-items: center;
      column-gap: 0.5rem;
    }
    .issues-move {
      overflow: auto;
    }
    .issue-move {
      border-bottom: 1px solid var(--popup-divider);
    }
  }

  .divider {
    border-bottom: 1px solid var(--theme-divider-color);
  }

  .disabled {
    cursor: not-allowed;
    color: var(--dark-color);
  }
</style>
