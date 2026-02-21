<!--
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain
// a copy of the License at https://www.eclipse.org/legal/epl-2.0
-->
<script lang="ts">
  import type { Class, Doc, DocumentQuery, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { ButtonMenu, IconCopy, IconMoreH, type DropdownIntlItem } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { viewletContextStore } from '@hcengineering/view-resources'
  import { copyAsMarkdownTableFromResource, copyRelationshipTableAsMarkdown } from '../markdown/copyActions'

  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Doc> = {}
  export let config: Array<string | import('@hcengineering/view').BuildModelKey> = []

  // TODO: Register actions separately and make common extension for viewlet actions
  const COPY_ALL_ACTION_ID = 'copy-all'

  $: ctx = $viewletContextStore?.getLastContext()
  $: relationshipTableData = ctx?.relationshipTableData
  $: viewlet = ctx?.viewlet

  $: hasData = relationshipTableData !== undefined || (_class !== undefined && query !== undefined)
  $: actions = [
    {
      id: COPY_ALL_ACTION_ID,
      label: view.string.CopyAll,
      icon: IconCopy
    }
  ] satisfies DropdownIntlItem[]

  async function handleCopyAll (e: Event): Promise<void> {
    if (relationshipTableData !== undefined) {
      await copyRelationshipTableAsMarkdown(e, relationshipTableData)
    } else if (_class !== undefined && query !== undefined) {
      const client = getClient()
      const docs = await client.findAll(_class, query, { limit: 1000 })
      await copyAsMarkdownTableFromResource(e, {
        cardClass: _class,
        viewlet,
        config,
        query,
        docs
      })
    }
  }

  async function onActionSelected (event?: CustomEvent): Promise<void> {
    if (event == null || event.detail !== COPY_ALL_ACTION_ID) {
      return
    }

    await handleCopyAll(event)
  }
</script>

{#if hasData}
  <ButtonMenu size="small" noSelection icon={IconMoreH} items={actions} on:selected={onActionSelected} />
{/if}
