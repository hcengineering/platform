<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Class, DocumentQuery, Ref, Space } from '@hcengineering/core'
  import type { IntlString, Asset } from '@hcengineering/platform'
  import { IModeSelector, resolvedLocationStore } from '@hcengineering/ui'
  import documents, { type Document, type DocumentSpace, DocumentState } from '@hcengineering/controlled-documents'

  import Documents from './Documents.svelte'
  import document from '../plugin'
  import { createQuery } from '@hcengineering/presentation'

  export let _class: Ref<Class<Document>> = document.class.Document
  export let query: DocumentQuery<Document> = {}
  export let title: IntlString
  export let icon: Asset | undefined = undefined
  export let space: Ref<Space> | undefined = undefined
  export let config: [string, IntlString, object][]
  export let panelWidth: number = 0

  const dispatch = createEventDispatcher()

  let mode: string | undefined = undefined
  let modeSelectorProps: IModeSelector | undefined = undefined

  let spaces: Ref<DocumentSpace>[] = []
  const spacesQuery = createQuery()

  $: spacesQuery.query(
    documents.class.DocumentSpace,
    {},
    (res) => {
      spaces = res.map((s) => s._id)
    },
    {
      projection: {
        _id: 1
      }
    }
  )

  // NOTE: we have to use "{ type: { $in:" queries below. Otherwise, it breaks when combined
  // with custom Filters added by State.
  $: inProgress = { state: { $in: [DocumentState.Draft] }, space: { $in: spaces } }
  $: effective = { state: { $in: [DocumentState.Effective] }, space: { $in: spaces } }
  $: archived = { state: { $in: [DocumentState.Archived, DocumentState.Deleted] }, space: { $in: spaces } }
  $: obsolete = { state: { $in: [DocumentState.Obsolete] }, space: { $in: spaces } }
  $: all = { space: { $in: spaces } }

  $: queries = { inProgress, effective, archived, obsolete, all }

  $: mode = $resolvedLocationStore.query?.mode ?? undefined
  $: if (mode === undefined || (queries as any)[mode] === undefined) {
    ;[[mode]] = config
  }

  let modifiedQuery: DocumentQuery<Document> = { ...query }

  $: if (mode !== undefined) {
    modifiedQuery = { ...query, ...(queries as any)[mode] }
    modeSelectorProps = {
      config,
      mode,
      onChange: (newMode: string) => dispatch('action', { mode: newMode })
    }
  }
</script>

<Documents query={modifiedQuery} {_class} {icon} {title} {space} {panelWidth} {modeSelectorProps} />
