<!--
// Copyright © 2026 TraceX SAS.
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain
// a copy of the License at https://www.eclipse.org/legal/epl-2.0
-->
<script lang="ts">
  import type { Class, Doc, DocumentQuery, Ref } from '@hcengineering/core'
  import { Button, IconCopy } from '@hcengineering/ui'
  import view, { type BuildModelKey } from '@hcengineering/view'
  import { openCopyTableDialog } from '../copyTable'

  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Doc> = {}
  export let config: Array<string | BuildModelKey> = []
</script>

{#if _class !== undefined}
  <Button
    size="small"
    kind="ghost"
    icon={IconCopy}
    showTooltip={{ label: view.string.CopyAsMarkdownTable }}
    on:click={() => {
      openCopyTableDialog({ cardClass: _class, query, config })
    }}
  />
{/if}
