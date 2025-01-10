<!-- //
// Copyright © 2025 Hardcore Engineering Inc.
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
// -->
<script lang="ts">
import { type LinkPreviewDetails } from '@hcengineering/presentation'
import { fetchJson } from '@hcengineering/presentation'
import { type Attachment } from '@hcengineering/attachment'
import { type WithLookup } from '@hcengineering/core'
import { Spinner } from '@hcengineering/ui'
export let attachment: WithLookup<Attachment>

async function fetchViewModel (): Promise<LinkPreviewDetails> {
  try {
    return await fetchJson(attachment.file, attachment.name) as LinkPreviewDetails
  } catch {
    return {}
  }
}

</script>
<div class="quote">
  {#await fetchViewModel()}
  <div class="centered">
    <Spinner size="medium" />
  </div>
  {:then md }
  <div class="content">
    <div class="flex">
      {#if md.icon}
      <img src={md.icon} width=22 height=22 class="round-image" alt="link-preview-icon" />
      &nbsp;
      {/if}
      <b><a target="_blank" href="{md.host}">{md.hostname}</a></b>
    </div>
    {#if md.title !== md.hostname}
    <b><a target="_blank" href="{md.url}">{md.title}</a></b>
    <br/>
    {/if}
    {#if md.description}
    {md.description}
    {/if}
    {#if md.image}
    <img src={md.image} class="round-image" alt="link-preview"/>
    {/if}
  </div>
  {/await}
</div>

<style lang="scss">
  .round-image {
    border-radius: 5px;
    max-width: 15rem;
    max-height: 15rem;
  }
  .quote {
    border-left: 0.25rem solid;
    padding-left: 15px;
  }
  .content {
    max-width: 25rem;
    max-height: 25rem;
  }
</style>
