<!--
// Copyright © 2023 Hardcore Engineering Inc.
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

  import view from '@hcengineering/view'
  import { Button, ButtonSize, LabelAndProps } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'
  import tracker, { Project } from '@hcengineering/tracker'
  import { Ref, Space } from '@hcengineering/core'

  export let space: Ref<Space>
  export let value: Project
  export let size: ButtonSize = 'medium'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = 'min-content'
  export let showTooltip: LabelAndProps | undefined = undefined
  const client = getClient()

  async function removeProject () {
    await client.removeDoc(tracker.class.Project, space, value._id)
  }
</script>

<Button
  {size}
  {width}
  {justify}
  {showTooltip}
  icon={view.icon.Delete}
  on:click={() => removeProject()}
/>
