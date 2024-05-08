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
  import { Ref, getCurrentAccount } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import task, { Project } from '@hcengineering/task'
  import { Label, Separator } from '@hcengineering/ui'
  import { ObjectPresenter, TreeNode } from '@hcengineering/view-resources'
  import time from '../../plugin'

  export let navFloat: boolean = false
  export let appsDirection: 'vertical' | 'horizontal' = 'horizontal'
  export let selected: Ref<Project> | undefined = (localStorage.getItem('team_last_mode') as Ref<Project>) ?? undefined

  let projects: Project[] = []
  const projectsQuery = createQuery()

  projectsQuery.query(
    task.class.Project,
    {
      archived: false,
      members: getCurrentAccount()._id
    },
    (result) => {
      projects = result
    }
  )
</script>

<div class="antiPanel-navigator {appsDirection === 'horizontal' ? 'portrait' : 'landscape'}">
  <div class="antiPanel-wrap__content">
    <div class="antiNav-header overflow-label">
      <Label label={time.string.Team} />
      <Label label={time.string.Planner} />
    </div>
    <TreeNode _id={'projects-planning'} label={time.string.Team} node>
      {#each projects as _project}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="antiNav-element parent"
          class:selected={selected === _project._id}
          on:click={() => {
            selected = _project._id
            localStorage.setItem('team_last_mode', selected)
          }}
        >
          <ObjectPresenter objectId={_project._id} _class={_project._class} value={_project} />
        </div>
      {/each}
    </TreeNode>
    <div class="antiNav-divider line" />
  </div>
  <Separator
    name={'time'}
    float={navFloat ? 'navigator' : true}
    index={0}
    disabledWhen={['panel-aside']}
    color={'var(--theme-navpanel-border)'}
  />
</div>
