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
  import SprintPopup from './SprintPopup.svelte'
  import { Sprint } from '@hcengineering/tracker'

  export let sprints: Sprint[]
  export let moveAndDeleteSprint: (selectedSprint?: Sprint) => Promise<void>

  let selectedSprint: Sprint | undefined
  let noSprintLabel: string

  $: translate(tracker.string.NoSprint, {}).then((label) => (noSprintLabel = label))
  $: selectedSprintLabel = selectedSprint?.label ?? noSprintLabel
</script>

<Card
  canSave
  label={tracker.string.MoveAndDeleteSprint}
  labelProps={{ newSprint: selectedSprintLabel, deleteSprint: sprints.map((p) => p.label) }}
  okLabel={tracker.string.Delete}
  okAction={() => moveAndDeleteSprint(selectedSprint)}
  on:close
  on:changeContent
>
  <SprintPopup
    _class={tracker.class.Sprint}
    ignoreSprints={sprints}
    allowDeselect
    closeAfterSelect={false}
    shadows={false}
    width="full"
    on:update={({ detail }) => (selectedSprint = detail)}
  />
</Card>
