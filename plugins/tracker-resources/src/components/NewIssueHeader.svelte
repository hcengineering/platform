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
  import core, {
    AccountRole,
    Ref,
    Space,
  } from '@hcengineering/core'
  import { MultipleDraftController, createQuery, getClient } from '@hcengineering/presentation'
  import { TrackerEvents } from '@hcengineering/tracker'
  import { HeaderButton, showPopup } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  import { onDestroy } from 'svelte'
  import tracker from '../plugin'
  import CreateIssue from './CreateIssue.svelte'

  export let currentSpace: Ref<Space> | undefined

  let closed = true
  let draftExists = false
  let projectExists = false
  let loading = true

  const query = createQuery()
  const client = getClient()
  const draftController = new MultipleDraftController(tracker.ids.IssueDraft)
  const newIssueKeyBindingPromise = client.findOne(view.class.Action, { _id: tracker.action.NewIssue }).then(p => p?.keyBinding)

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
    closed = false
    showPopup(tracker.component.CreateProject, {}, 'top', () => {
      closed = true
    })
  }

  function newIssue (): void {
    closed = false
    Analytics.handleEvent(TrackerEvents.NewIssueButtonClicked)
    showPopup(CreateIssue, { space: currentSpace, shouldSaveDraft: true }, 'top', () => {
      closed = true
    })
  }

  let mainActionId: string | undefined = undefined
  let visibleActions: string[] = []
  function updateActions (draft: boolean, project: boolean, closed: boolean): void {
    mainActionId = draft || !closed ? tracker.string.ResumeDraft : tracker.string.NewIssue
    if (project) {
      visibleActions = [
        tracker.string.CreateProject,
        mainActionId,
        tracker.string.Import
      ]
    } else {
      visibleActions = [
        tracker.string.CreateProject
      ]
    }
  }

  $: updateActions(draftExists, projectExists, closed)

</script>

<HeaderButton
  {loading}
  {client}
  {mainActionId}
  {visibleActions}
  actions={[
    {
      id: tracker.string.CreateProject,
      label: tracker.string.CreateProject,
      accountRole: AccountRole.Maintainer,
      permission: {
        id: core.permission.CreateProject,
        space: core.space.Space
      },
      callback: newProject
    },
    {
      id: tracker.string.ResumeDraft,
      label: tracker.string.ResumeDraft,
      draft: true,
      keyBindingPromise: newIssueKeyBindingPromise,
      callback: newIssue
    },
    {
      id: tracker.string.NewIssue,
      label: tracker.string.NewIssue,
      keyBindingPromise: newIssueKeyBindingPromise,
      callback: newIssue
    },
    {
      id: tracker.string.Import,
      label: tracker.string.Import,
      accountRole: AccountRole.User,
      callback: newIssue
    }]}
/>
