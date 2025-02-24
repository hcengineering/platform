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
  import { Ref } from '@hcengineering/core'
  import type { Drive, Folder, Resource } from '@hcengineering/drive'
  import presentation, { Card, getClient, SpaceSelector } from '@hcengineering/presentation'
  import view from '@hcengineering/view'
  import { ObjectBox } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'

  import drive from '../plugin'
  import { moveResources } from '../utils'

  import DrivePresenter from './DrivePresenter.svelte'
  import ResourcePresenter from './ResourcePresenter.svelte'

  export let value: Resource

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  let space: Ref<Drive> = value.space as Ref<Drive>
  let parent: Ref<Folder> = value.parent as Ref<Folder>

  async function save (): Promise<void> {
    await moveResources([value], space, parent ?? drive.ids.Root)
  }

  let children: Ref<Folder>[] = []
  $: void updateChildren(value)

  async function updateChildren (resource: Resource): Promise<void> {
    children = await findChildren(resource)
  }

  async function findChildren (resource: Resource): Promise<Array<Ref<Folder>>> {
    if (hierarchy.isDerived(resource._class, drive.class.Folder)) {
      const children = await client.findAll(
        drive.class.Folder,
        { space: resource.space, path: resource._id as Ref<Folder> },
        { projection: { _id: 1 } }
      )

      return children.map((p) => p._id)
    }

    return []
  }

  $: canSave = space !== value.space || parent !== value.parent
</script>

<Card
  label={view.string.Move}
  okAction={save}
  okLabel={presentation.string.Save}
  fullSize
  {canSave}
  on:close={() => dispatch('close')}
  on:changeContent
>
  <svelte:fragment slot="header">
    <ResourcePresenter {value} shouldShowAvatar={false} noUnderline />
  </svelte:fragment>

  <div class="flex-row-center gap-2 min-w-100">
    <SpaceSelector
      bind:space
      _class={drive.class.Drive}
      label={drive.string.Drive}
      component={DrivePresenter}
      iconWithEmoji={view.ids.IconWithEmoji}
      defaultIcon={drive.icon.Drive}
      kind={'regular'}
      size={'small'}
      on:change={() => {
        parent = drive.ids.Root
      }}
    />
    <ObjectBox
      bind:value={parent}
      _class={drive.class.Folder}
      label={drive.string.Root}
      docQuery={{ space }}
      kind={'regular'}
      size={'small'}
      searchField={'name'}
      allowDeselect={true}
      showNavigate={false}
      docProps={{ disabled: true, noUnderline: true }}
      excluded={[value._id, ...children]}
    />
  </div>
</Card>
