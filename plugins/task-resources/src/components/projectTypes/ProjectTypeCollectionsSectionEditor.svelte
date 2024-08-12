<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { ButtonIcon, IconAdd, IconFolder, Label } from '@hcengineering/ui'
  import { ProjectType, ProjectTypeDescriptor } from '@hcengineering/task'
  import task from '../../plugin'

  export let type: ProjectType | undefined
  export let descriptor: ProjectTypeDescriptor | undefined
  export let disabled: boolean = true
</script>

{#if descriptor !== undefined}
  <div class="hulyTableAttr-header font-medium-12">
    <IconFolder size="small" />
    <span><Label label={task.string.Collections} /></span>
    <ButtonIcon kind="primary" icon={IconAdd} size="small" dataId={'btnAdd'} {disabled} on:click={() => {}} />
  </div>
{/if}
