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
  import { Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Project } from '@hcengineering/tracker'
  import { Icon, IconWithEmoji, getPlatformColorDef, getPlatformColorForTextDef, themeStore } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import view from '@hcengineering/view'

  export let value: [Ref<Project>, Ref<Project>[]][]

  const MAX_VISIBLE_PROJECTS = 5
  const projectsQuery = createQuery()

  let projects: Project[] = []

  $: projectsQuery.query(
    tracker.class.Project,
    { _id: { $in: value.map(([_, values]) => values[0]) } },
    (res) => (projects = res)
  )
</script>

<div class="flex-presenter flex-gap-1-5">
  {#each projects as project, i}
    {#if value && i < MAX_VISIBLE_PROJECTS}
      {@const icon = project.icon === view.ids.IconWithEmoji ? IconWithEmoji : project.icon ?? tracker.icon.Home}
      {@const iconProps =
        project.icon === view.ids.IconWithEmoji
          ? { icon: project.color }
          : {
              fill:
                project.color !== undefined
                  ? getPlatformColorDef(project.color, $themeStore.dark).icon
                  : getPlatformColorForTextDef(project.name ?? '', $themeStore.dark).icon
            }}
      <Icon {icon} {iconProps} size="small" />
    {/if}
  {/each}
  {#if projects.length > MAX_VISIBLE_PROJECTS}
    <div>
      +{projects.length - MAX_VISIBLE_PROJECTS}
    </div>
  {/if}
</div>
