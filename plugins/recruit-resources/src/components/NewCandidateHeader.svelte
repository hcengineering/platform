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
  import { MultipleDraftController } from '@hcengineering/presentation'
  import { Button, IconAdd, showPopup } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import recruit from '../plugin'
  import CreateCandidate from './CreateCandidate.svelte'
  import { Analytics } from '@hcengineering/analytics'
  import { RecruitEvents } from '@hcengineering/recruit'

  let draftExists = false

  const client = getClient()
  const draftController = new MultipleDraftController(recruit.mixin.Candidate)
  const newRecruitKeyBindingPromise = client
    .findOne(view.class.Action, { _id: recruit.action.CreateTalent })
    .then((p) => p?.keyBinding)


  onDestroy(
    draftController.hasNext((res) => {
      draftExists = res
    })
  )

  async function newCandidate (): Promise<void> {
    showPopup(CreateCandidate, { shouldSaveDraft: true }, 'top')
    Analytics.handleEvent(RecruitEvents.NewTalentButtonClicked)
  }

  let mainActionId: string | undefined = undefined
  let visibleActions: string[] = []
  function updateActions (draft: boolean): void {
    mainActionId = draft ? recruit.string.ResumeDraft : recruit.string.CreateTalent
    visibleActions = [mainActionId]
  }

  $: updateActions(draftExists)
</script>

<HeaderButton
  {client}
  {mainActionId}
  {visibleActions}
  actions={[
    {
      id: recruit.string.CreateTalent,
      label: recruit.string.CreateTalent,
      accountRole: AccountRole.User,
      keyBindingPromise: newRecruitKeyBindingPromise,
      callback: newCandidate
    },
    {
      id: recruit.string.ResumeDraft,
      label: recruit.string.ResumeDraft,
      draft: true,
      accountRole: AccountRole.User,
      keyBindingPromise: newRecruitKeyBindingPromise,
      callback: newCandidate
    }
  ]}
/>
