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
  import { Analytics } from '@hcengineering/analytics'
  import { Ref, Space } from '@hcengineering/core'
  import { MultipleDraftController, createQuery, getClient } from '@hcengineering/presentation'
  import { TrackerEvents } from '@hcengineering/tracker'
  import { Button, IconAdd, IconDropdown, Loading, SelectPopup, showPopup, eventToHTMLElement } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  import { onDestroy } from 'svelte'
  import tracker from '../plugin'
  import CreateIssue from './CreateIssue.svelte'

  export let currentSpace: Ref<Space> | undefined

  let draftExists = false
  let projectExists = false
  let loading = true
  let keyBinding: string[] | undefined

  const query = createQuery()
  const client = getClient()
  const draftController = new MultipleDraftController(tracker.ids.IssueDraft)

  void client
    .findOne(view.class.Action, { _id: tracker.action.NewIssue })
    .then((p) => { keyBinding = p?.keyBinding })

  onDestroy(
    draftController.hasNext((res) => {
      draftExists = res
    })
  )

  query.query(tracker.class.Project, {}, (res) => {
    projectExists = res.length > 0
    loading = false
  })

  function newProject (): void {
    showPopup(tracker.component.CreateProject, {}, 'top')
  }

  function newIssue (): void {
    Analytics.handleEvent(TrackerEvents.NewIssueButtonClicked)
    showPopup(CreateIssue, { space: currentSpace, shouldSaveDraft: true }, 'top')
  }

  function openMenu (e: MouseEvent): void {
    const items: Array<{ id: string, label: any, action: () => void }> = []
    if (projectExists) {
      items.push({
        id: 'resume-draft',
        label: draftExists ? tracker.string.ResumeDraft : tracker.string.NewIssue,
        action: newIssue
      })
      items.push({
        id: 'import',
        label: tracker.string.Import,
        action: newIssue
      })
    }
    items.push({
      id: 'create-project',
      label: tracker.string.CreateProject,
      action: newProject
    })
    showPopup(
      SelectPopup,
      {
        value: items.map((i) => ({ id: i.id, label: i.label })),
        placeholder: undefined,
        searchable: false
      },
      eventToHTMLElement(e),
      (id) => {
        const sel = items.find((i) => i.id === id)
        sel?.action()
      }
    )
  }
</script>

{#if loading}
  <Loading shrink />
{:else if projectExists || draftExists}
  <div class="ni-actions">
    <Button
      kind="primary"
      icon={IconAdd}
      iconProps={{ size: 'medium' }}
      shape="round"
      on:click={newIssue}
      showTooltip={{ label: tracker.string.NewIssue, keys: keyBinding }}
    >
      <div slot="content" class="draft-circle-container">
        {#if draftExists}<div class="draft-circle" />{/if}
      </div>
    </Button>
    <Button
      kind="regular"
      icon={IconDropdown}
      iconProps={{ size: 'small' }}
      shape="round"
      showTooltip={{ label: tracker.string.More }}
      on:click={openMenu}
    />
  </div>
{:else}
  <div class="ni-actions">
    <Button
      kind="primary"
      icon={IconAdd}
      iconProps={{ size: 'medium' }}
      shape="round"
      on:click={newProject}
      showTooltip={{ label: tracker.string.CreateProject }}
    />
  </div>
{/if}

<style lang="scss">
  .ni-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
  }
  .draft-circle-container {
    position: absolute;
    top: -2px;
    right: -2px;
  }
  .draft-circle {
    height: 8px;
    width: 8px;
    background-color: var(--theme-state-warning-color, #f59e0b);
    border-radius: 50%;
    border: 1.5px solid var(--theme-bg-color);
  }
</style>
