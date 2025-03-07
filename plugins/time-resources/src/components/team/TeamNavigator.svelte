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
  import { Separator, Scroller, NavItem, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'
  import { ObjectPresenter, TreeNode } from '@hcengineering/view-resources'
  import { NavFooter, NavHeader } from '@hcengineering/workbench-resources'
  import time from '../../plugin'

  export let selected: Ref<Project> | undefined = (localStorage.getItem('team_last_mode') as Ref<Project>) ?? undefined

  let projects: Project[] = []
  const projectsQuery = createQuery()

  projectsQuery.query(
    task.class.Project,
    {
      archived: false,
      members: getCurrentAccount().uuid
    },
    (result) => {
      projects = result
    }
  )
  $: selectedItem = projects.find((pr) => pr._id === selected)
</script>

<div
  class="antiPanel-navigator {$deviceInfo.navigator.direction === 'horizontal' ? 'portrait' : 'landscape'} border-left"
  class:fly={$deviceInfo.navigator.float}
>
  <div class="antiPanel-wrap__content hulyNavPanel-container">
    <NavHeader label={time.string.TeamPlanner} />

    <Scroller shrink>
      <TreeNode
        _id={'projects-planning'}
        label={time.string.Team}
        isFold
        empty={projects.length === 0}
        highlighted={selected !== undefined}
        visible={selected !== undefined}
        noDivider
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
  {#if !($deviceInfo.isMobile && $deviceInfo.isPortrait && $deviceInfo.minWidth)}
    <Separator
      name={'time'}
      float={$deviceInfo.navigator.float ? 'navigator' : true}
      index={0}
      color={'var(--theme-divider-color)'}
    />
  {/if}
</div>
