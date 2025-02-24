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
  import { type Blob, type Ref, type WithLookup } from '@hcengineering/core'
  import drive, { type File, type FileVersion } from '@hcengineering/drive'
  import { FilePreview, createQuery } from '@hcengineering/presentation'

  import { createEventDispatcher, onMount } from 'svelte'
  import EditFileVersions from './EditFileVersions.svelte'

  export let object: File
  export let readonly: boolean = false

  const dispatch = createEventDispatcher()
  const query = createQuery()

  let blob: Ref<Blob> | undefined = undefined
  let version: WithLookup<FileVersion> | undefined = undefined
  let contentType: string | undefined

  $: query.query(drive.class.FileVersion, { _id: object.file }, (res) => {
    ;[version] = res
    blob = version.file
    contentType = version.type
  })

  onMount(() => {
    dispatch('open', { ignoreKeys: ['parent', 'path', 'version', 'versions'] })
  })
</script>

{#if object !== undefined && version !== undefined && blob !== undefined && contentType !== undefined}
  <FilePreview
    file={blob}
    {contentType}
    name={version.title}
    metadata={version.metadata}
    fit={contentType !== 'application/pdf'}
  />

  {#if object.versions > 1}
    <div class="w-full mt-6">
      <EditFileVersions {object} {readonly} />
    </div>
  {/if}
{/if}
