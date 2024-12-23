<!--
//
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
//
-->
<script lang="ts">
  import core, { Data, Ref } from '@hcengineering/core'
  import { type Drive, type Folder, createFolder, DriveEvents } from '@hcengineering/drive'
  import { Card, SpaceSelector, getClient } from '@hcengineering/presentation'
  import { EditBox, FocusHandler, createFocusManager } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { ObjectBox } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'

  import drive from '../plugin'
  import { Analytics } from '@hcengineering/analytics'

  export function canClose (): boolean {
    return name === ''
  }

  export let space: Ref<Drive> | undefined
  export let parent: Ref<Folder> | undefined

  const dispatch = createEventDispatcher()

  let _space = space
  let _parent = parent !== drive.ids.Root ? parent : undefined
  let name = ''

  $: if (_space !== space) _parent = undefined
  $: canSave = getTitle(name).length > 0 && _space !== undefined

  function getTitle (value: string): string {
    return value.trim()
  }

  async function create (): Promise<void> {
    if (_space === undefined) {
      return
    }

    const data: Omit<Data<Folder>, 'path'> = {
      title: getTitle(name),
      parent: _parent ?? drive.ids.Root
    }

    const id = await createFolder(getClient(), _space, data)
    Analytics.handleEvent(DriveEvents.FolderCreated, { id })
    dispatch('close', id)
  }

  const manager = createFocusManager()
</script>

<FocusHandler {manager} />

<Card
  label={drive.string.CreateFolder}
  okAction={create}
  {canSave}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <svelte:fragment slot="header">
    <SpaceSelector
      _class={drive.class.Drive}
      label={drive.string.Drive}
      bind:space={_space}
      kind={'regular'}
      size={'small'}
      iconWithEmoji={view.ids.IconWithEmoji}
      defaultIcon={drive.icon.Drive}
    />
    <ObjectBox
      _class={drive.class.Folder}
      bind:value={_parent}
      docQuery={{
        space: _space
      }}
      kind={'regular'}
      size={'small'}
      label={drive.string.Root}
      searchField={'name'}
      allowDeselect
      showNavigate={false}
      docProps={{ disabled: true, noUnderline: true }}
    />
  </svelte:fragment>

  <div class="flex-row-center clear-mins">
    <EditBox placeholder={core.string.Name} bind:value={name} kind={'large-style'} autoFocus focusIndex={1} />
  </div>
</Card>
