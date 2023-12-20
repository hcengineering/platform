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
  import { Ref, WithLookup } from '@hcengineering/core'
  import { ProjectType, TaskType } from '@hcengineering/task'
  import { StatePresenter } from '@hcengineering/task-resources'
  import { IssueStatus, Project } from '@hcengineering/tracker'
  import { IconSize } from '@hcengineering/ui'
  import { activeProjects } from '../../utils'

  export let value: WithLookup<IssueStatus> | undefined
  export let size: IconSize
  export let space: Ref<Project> | undefined = undefined
  export let projectType: Ref<ProjectType> | undefined = undefined
  export let taskType: Ref<TaskType> | undefined = undefined

  $: _space = space !== undefined ? ($activeProjects.get(space) as Project) : undefined
</script>

<StatePresenter
  {space}
  projectType={_space?.type ?? projectType}
  {taskType}
  {value}
  {size}
  shouldShowName={false}
  on:accent-color
/>
