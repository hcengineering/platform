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
  import { type File, type Folder, type Resource } from '@hcengineering/drive'
  import { getClient } from '@hcengineering/presentation'
  import { ObjectPresenterType } from '@hcengineering/view'

  import drive from '../plugin'

  import FilePresenter from './FilePresenter.svelte'
  import FolderPresenter from './FolderPresenter.svelte'

  export let value: Resource
  export let inline: boolean = false
  export let disabled: boolean = false
  export let accent: boolean = false
  export let noUnderline: boolean = false
  export let shouldShowAvatar = true
  export let type: ObjectPresenterType = 'link'

  function isFile (value: Resource): value is File {
    return getClient().getHierarchy().isDerived(value._class, drive.class.File)
  }

  function isFolder (value: Resource): value is Folder {
    return getClient().getHierarchy().isDerived(value._class, drive.class.Folder)
  }
</script>

{#if value}
  {#if isFile(value)}
    <FilePresenter {value} {inline} {disabled} {accent} {noUnderline} {shouldShowAvatar} {type} />
  {:else if isFolder(value)}
    <FolderPresenter {value} {inline} {disabled} {accent} {noUnderline} {shouldShowAvatar} {type} />
  {/if}
{/if}
