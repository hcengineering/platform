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
  import core, { type Blob, type WithLookup } from '@hcengineering/core'
  import drive, { type File, type FileVersion } from '@hcengineering/drive'
  import { FilePreview, createQuery } from '@hcengineering/presentation'

  import { createEventDispatcher, onMount } from 'svelte'
  import EditFileVersions from './EditFileVersions.svelte'

  export let object: File
  export let readonly: boolean = false

  const dispatch = createEventDispatcher()
  const query = createQuery()

  let blob: Blob | undefined = undefined
  let version: WithLookup<FileVersion> | undefined = undefined

  $: query.query(
    drive.class.FileVersion,
    { _id: object.file },
    (res) => {
      ;[version] = res
      blob = version?.$lookup?.file
    },
    {
      lookup: {
        file: core.class.Blob
      }
    }
  )

  onMount(() => {
    dispatch('open', { ignoreKeys: ['parent', 'path', 'version', 'versions'] })
  })
</script>

{#if object !== undefined && version !== undefined}
  {#if blob !== undefined}
    <FilePreview file={blob} name={version.name} metadata={version.metadata} />
  {/if}

  {#if object.versions > 1}
    <div class="w-full mt-6">
      <EditFileVersions {object} {readonly} />
    </div>
  {/if}
{/if}
