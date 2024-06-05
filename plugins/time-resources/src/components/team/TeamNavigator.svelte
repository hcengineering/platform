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
  import { Label, Separator, Scroller, NavItem } from '@hcengineering/ui'
  import { ObjectPresenter, TreeNode } from '@hcengineering/view-resources'
  import { NavFooter } from '@hcengineering/workbench-resources'
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
  $: selectedItem = projects.find((pr) => pr._id === selected)
</script>

<div class="antiPanel-navigator {appsDirection === 'horizontal' ? 'portrait' : 'landscape'}">
  <div class="antiPanel-wrap__content hulyNavPanel-container">
    <div class="hulyNavPanel-header">
      <span class="overflow-label"><Label label={time.string.TeamPlanner} /></span>
    </div>

    <Scroller shrink>
      <TreeNode
        _id={'projects-planning'}
        label={time.string.Team}
        isFold
        empty={projects.length === 0}
        highlighted={selected !== undefined}
        visible={selected !== undefined}
      >
        {#each projects as _project}
          <NavItem
            selected={selected === _project._id}
            on:click={() => {
              selected = _project._id
              localStorage.setItem('team_last_mode', selected)
            }}
          >
            <ObjectPresenter
              objectId={_project._id}
              _class={_project._class}
              value={_project}
              colorInherit={selected === _project._id}
            />
          </NavItem>
        {/each}
        <svelte:fragment slot="visible">
          {#if selected && selectedItem}
            <NavItem selected>
              <ObjectPresenter
                objectId={selectedItem._id}
                _class={selectedItem._class}
                value={selectedItem}
                colorInherit
              />
            </NavItem>
          {/if}
        </svelte:fragment>
      </TreeNode>
    </Scroller>
    <NavFooter />
  </div>
  <Separator
    name={'time'}
    float={navFloat ? 'navigator' : true}
    index={0}
    disabledWhen={['panel-aside']}
    color={'var(--theme-navpanel-border)'}
  />
</div>
