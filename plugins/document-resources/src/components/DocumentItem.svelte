<!--
//
// Copyright © 2022 Hardcore Engineering Inc.
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
//
-->
<script lang="ts">
  import { WithLookup } from '@hcengineering/core'
  import { Document, DocumentVersion } from '@hcengineering/document'
  import { Icon } from '@hcengineering/ui'
  import document from '../plugin'

  export let value: WithLookup<Document>

  const versions = (value.$lookup?.versions ?? []) as DocumentVersion[]
  const lastVersion = versions.length > 0 ? versions[versions.length - 1] : undefined
</script>

<div class="flex-row-center">
  <div class="flex-center p-1 content-dark-color flex-no-shrink mr-2-5">
    <Icon icon={document.icon.Document} size={'medium'} />
  </div>
  <span class="overflow-label">
    {value.name}
    {#if lastVersion}
      - {lastVersion?.version}
    {/if}
  </span>
</div>
