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
  import FileUploadStatusBar from './FileUploadStatusBar.svelte'
  import { uploads } from '../store'
</script>

{#if $uploads.size > 0}
  <div class="flex-row-center flex-gap-2">
    {#each $uploads as [,value]}
      <FileUploadStatusBar upload={value} />
    {/each}
  </div>
{/if}
