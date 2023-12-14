<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022, 2023 Hardcore Engineering Inc.
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
  import { generateId } from '@hcengineering/core'
  import { Button, IconAdd, Menu, getEventPopupPositionElement, showPopup } from '@hcengineering/ui'

  import { translate } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import task, { ProjectTypeDescriptor, createProjectType } from '@hcengineering/task'

  const client = getClient()

  async function createType (descriptor: ProjectTypeDescriptor): Promise<void> {
    const descriptorName = await translate(descriptor.name, {})

    await createProjectType(
      client,
      {
        name: `New ${descriptorName} project type`,
        descriptor: descriptor._id,
        description: '',
        tasks: []
      },
      [],
      generateId()
    )
  }

  async function chooseProjectType (evt: MouseEvent): Promise<void> {
    const descriptors = client.getModel().findAllSync(task.class.ProjectTypeDescriptor, {})
    showPopup(
      Menu,
      {
        actions: descriptors.map((it) => ({
          label: it.name,
          action: () => {
            void createType(it)
          }
        }))
      },
      getEventPopupPositionElement(evt)
    )
  }
</script>

<Button id="new-project-type" icon={IconAdd} kind={'link'} size="small" on:click={chooseProjectType} />
