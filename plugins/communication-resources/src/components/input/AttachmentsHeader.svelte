<!--
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
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { getClient } from '@hcengineering/presentation'
  import { Attachment } from '@hcengineering/communication-types'
  import { Loading } from '@hcengineering/ui'

  import { AppletDraft, BlobDraft, LinkPreviewDraft } from '../../types'
  import communication from '../../plugin'

  import AppletPreview from './AppletPreview.svelte'
  import BlobPreview from './BlobPreview.svelte'
  import LinkPreview from './LinkPreview.svelte'

  export let blobs: BlobDraft[] = []
  export let links: LinkPreviewDraft[] = []
  export let applets: AppletDraft[] = []
  export let currentAttachments: Attachment[] = []
  export let progress = false

  const dispatch = createEventDispatcher()
  const client = getClient()
  const appletModels = client.getModel().findAllSync(communication.class.Applet, {})
</script>

<div class="flex-row-center attachments-list scroll-divider-color flex-gap-2 mt-2">
  {#if progress}
    <div class="flex p-3">
      <Loading />
    </div>
  {/if}

  {#each applets as applet (applet.id)}
    {@const model = appletModels.find((it) => it._id === applet.appletId)}
    {#if model}
      <AppletPreview
        {applet}
        {model}
        editing={currentAttachments.some((it) => it.id === applet.id)}
        on:change={(e) => dispatch('change-applet', e.detail)}
        on:delete={(e) => dispatch('delete-applet', e.detail)}
      />
    {/if}
  {/each}

  {#if applets.length > 0 && (blobs.length > 0 || links.length > 0)}
    <div class="divider" />
  {/if}

  {#each blobs as blob (blob.blobId)}
    <BlobPreview
      {blob}
      on:delete={(e) => {
        dispatch('delete-blob', e.detail)
      }}
    />
  {/each}

  {#if links.length > 0 && (blobs.length > 0 || applets.length > 0)}
    <div class="divider" />
  {/if}

  {#each links as link}
    <LinkPreview
      {link}
      on:delete={(e) => {
        dispatch('delete-link', e.detail)
      }}
    />
  {/each}
</div>

<style lang="scss">
  .divider {
    height: 100%;
    border-left: 1px solid var(--theme-divider-color);
  }
  .attachments-list {
    overflow-x: auto;
    overflow-y: hidden;
    display: flex;
    gap: 0.5rem;
  }
</style>
