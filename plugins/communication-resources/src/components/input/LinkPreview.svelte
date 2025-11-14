<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { LinkPreviewCard } from '@hcengineering/attachment-resources'

  import { LinkPreviewDraft } from '../../types'

  export let link: LinkPreviewDraft

  const dispatch = createEventDispatcher()
</script>

<div class="item flex">
  <LinkPreviewCard
    value={{
      url: link.url,
      host: link.host,
      title: link.title,
      description: link.description,
      hostname: link.siteName,
      image: link.previewImage?.url,
      imageWidth: link.previewImage?.width,
      imageHeight: link.previewImage?.height,
      icon: link.iconUrl
    }}
    on:remove={(event) => {
      const result = event.detail
      if (result !== undefined) {
        dispatch('delete', link.url)
      }
    }}
  />
</div>
