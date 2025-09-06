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
  import { Class, Doc, DocumentQuery, Ref } from '@hcengineering/core'
  import { type Location } from '@hcengineering/ui'
  import { type Resource } from '@hcengineering/platform'
  import { IntlString, Asset } from '@hcengineering/platform'

  import FoldersBrowser from './folders/FoldersBrowser.svelte'

  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Doc>
  export let titleKey: string = 'title'
  export let parentKey: string = 'parent'
  export let noParentId: Ref<Doc>
  export let getFolderLink: Resource<(doc: Ref<Doc> | undefined) => Location> | undefined
  export let allObjectsIcon: Asset
  export let allObjectsLabel: IntlString
  export let plainList: boolean = false
</script>

<FoldersBrowser
  {_class}
  {query}
  {titleKey}
  {parentKey}
  {noParentId}
  {getFolderLink}
  {allObjectsIcon}
  {allObjectsLabel}
  {plainList}
  on:select
/>
