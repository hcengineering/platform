<!--
//
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
//
-->
<script lang="ts">
  import tracker from '../../plugin'
  import { Card } from '@hcengineering/presentation'
  import { translate } from '@hcengineering/platform'
  import MilestonePopup from './MilestonePopup.svelte'
  import { Milestone } from '@hcengineering/tracker'
  import { themeStore } from '@hcengineering/ui'

  export let milestones: Milestone[]
  export let moveAndDeleteMilestone: (selectedMilestone?: Milestone) => Promise<void>

  let selectedMilestone: Milestone | undefined
  let noMilestoneLabel: string

  $: translate(tracker.string.NoMilestone, {}, $themeStore.language).then((label) => (noMilestoneLabel = label))
  $: selectedMilestoneLabel = selectedMilestone?.label ?? noMilestoneLabel
</script>

<Card
  canSave
  label={tracker.string.MoveAndDeleteMilestone}
  labelProps={{ newMilestone: selectedMilestoneLabel, deleteMilestone: milestones.map((p) => p.label) }}
  okLabel={tracker.string.Delete}
  okAction={() => moveAndDeleteMilestone(selectedMilestone)}
  on:close
  on:changeContent
>
  <MilestonePopup
    _class={tracker.class.Milestone}
    ignoreMilestones={milestones}
    allowDeselect
    closeAfterSelect={false}
    shadows={false}
    width="full"
    on:update={({ detail }) => (selectedMilestone = detail)}
  />
</Card>
