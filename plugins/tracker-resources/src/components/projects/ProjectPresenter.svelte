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
  import { getCurrentAccount, Ref } from '@hcengineering/core'
  import presentation, { createQuery, IconWithEmoji, isAdminUser } from '@hcengineering/presentation'
  import { Project } from '@hcengineering/tracker'
  import { Icon, Label, getPlatformColorDef, getPlatformColorForTextDef, themeStore } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { NavLink } from '@hcengineering/view-resources'
  import tracker from '../../plugin'

  export let value: Project | Ref<Project> | undefined
  export let inline: boolean = false
  export let accent: boolean = false
  export let colorInherit: boolean = false
  export let openIssues: boolean

  const projectQuery = createQuery()
  let projectObj: Project | undefined
  $: if (typeof value === 'string' && value !== undefined) {
    projectQuery.query<Project>(
      tracker.class.Project,
      { _id: value },
      (result) => {
        ;[projectObj] = result
      },
      { limit: 1 }
    )
  } else if (value !== undefined && typeof value === 'object') {
    projectObj = value
  } else {
    projectObj = undefined
  }
</script>

{#if projectObj}
  <div class="flex-presenter cursor-default" class:inline-presenter={inline} class:colorInherit>
    <div class="icon" class:emoji={projectObj.icon === view.ids.IconWithEmoji}>
      <Icon
        icon={projectObj.icon === view.ids.IconWithEmoji ? IconWithEmoji : (projectObj.icon ?? tracker.icon.Home)}
        iconProps={projectObj.icon === view.ids.IconWithEmoji
          ? { icon: projectObj.color }
          : {
              fill:
                projectObj.color !== undefined && typeof projectObj.color !== 'string'
                  ? getPlatformColorDef(projectObj.color, $themeStore.dark).icon
                  : getPlatformColorForTextDef(projectObj.name, $themeStore.dark).icon
            }}
        size="small"
      />
    </div>
    <span class="label no-underline nowrap" class:fs-bold={accent}>
      {#if openIssues && (isAdminUser() || projectObj.members.includes(getCurrentAccount().uuid))}
        <NavLink space={projectObj._id} special={'issues'} noUnderline={false}>
          {projectObj.name}
        </NavLink>
      {:else}
        {projectObj.name}
      {/if}
      {#if projectObj.archived}
        <Label label={presentation.string.Archived} />
      {/if}
    </span>
  </div>
{/if}
