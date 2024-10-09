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
  import { type WithLookup } from '@hcengineering/core'
  import drive, { type Resource } from '@hcengineering/drive'
  import { getBlobRef, getClient, sizeToWidth } from '@hcengineering/presentation'
  import { Icon, IconSize } from '@hcengineering/ui'

  import IconFolderThumbnail from './icons/FolderThumbnail.svelte'

  export let object: WithLookup<Resource>
  export let size: IconSize = 'x-large'

  const client = getClient()
  const hierarchy = client.getHierarchy()

  function extensionIconLabel (name: string): string {
    const parts = name.split('.')
    const ext = parts[parts.length - 1]
    return ext.substring(0, 4).toUpperCase()
  }

  let isImage = false
  let isError = false

  $: version = object.$lookup?.file
  $: previewRef = version?.file
  $: isImage = version?.type?.startsWith('image/') ?? false
  $: isFolder = hierarchy.isDerived(object._class, drive.class.Folder)
</script>

{#if isFolder}
  <Icon icon={IconFolderThumbnail} size={'full'} fill={'var(--global-no-priority-PriorityColor)'} />
{:else if previewRef != null && isImage && !isError}
  {#await getBlobRef(previewRef, object.title, sizeToWidth(size)) then blobSrc}
    <img
      draggable="false"
      class="img-fit"
      src={blobSrc.src}
      srcset={blobSrc.srcset}
      alt={object.title}
      on:error={() => {
        isError = true
      }}
    />
  {/await}
{:else}
  <div class="flex-center ext-icon">
    {extensionIconLabel(object.title)}
  </div>
{/if}

<style lang="scss">
  .ext-icon {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    font-weight: 500;
    font-size: 0.625rem;
    color: var(--primary-button-color);
    background-color: var(--primary-button-default);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.5rem;
  }

  .img-fit {
    object-fit: cover;
    height: 100%;
    width: 100%;
  }
</style>
