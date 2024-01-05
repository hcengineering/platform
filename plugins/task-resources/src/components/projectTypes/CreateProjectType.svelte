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
  import { Ref, generateId } from '@hcengineering/core'
  import { Card, getClient, hasResource } from '@hcengineering/presentation'
  import { ProjectTypeDescriptor, createProjectType } from '@hcengineering/task'
  import { DropdownLabelsIntl, EditBox, ToggleWithLabel } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import task from '../../plugin'
  import { Resource } from '@hcengineering/platform'

  const client = getClient()

  let name: string = ''
  let classic: boolean = true

  let descriptor: ProjectTypeDescriptor | undefined = undefined

  const dispatch = createEventDispatcher()

  async function createType (): Promise<void> {
    if (descriptor === undefined) {
      return
    }
    await createProjectType(
      client,
      {
        name,
        descriptor: descriptor._id,
        description: '',
        tasks: [],
        classic
      },
      [],
      generateId()
    )
    dispatch('close')
  }

  const descriptors = client
    .getModel()
    .findAllSync(task.class.ProjectTypeDescriptor, {})
    .filter((p) => hasResource(p._id as any as Resource<any>))
  const items = descriptors.map((it) => ({
    label: it.name,
    id: it._id
  }))

  function selectType (evt: CustomEvent<Ref<ProjectTypeDescriptor>>): void {
    descriptor = descriptors.find((it) => it._id === evt.detail)
  }
</script>

<Card
  label={task.string.CreateProjectType}
  canSave={name.trim().length > 0 && descriptor !== undefined}
  okAction={createType}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <div class="flex-col flex-gap-2">
    <EditBox bind:value={name} placeholder={task.string.ProjectType} />
    <DropdownLabelsIntl {items} on:selected={selectType} />
    <ToggleWithLabel label={task.string.ClassicProject} bind:on={classic} />
  </div>
</Card>
