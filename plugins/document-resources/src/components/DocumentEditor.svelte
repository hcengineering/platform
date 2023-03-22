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
  import { DocumentVersion } from '@hcengineering/document'
  import { getMetadata } from '@hcengineering/platform'

  import presentation from '@hcengineering/presentation'
  import document from '../plugin'

  import { CollaboratorEditor } from '@hcengineering/text-editor'
  import { Markup } from '@hcengineering/core'

  export let object: DocumentVersion
  export let readonly = false
  export let initialContentId: string | undefined = undefined
  export let comparedVersion: Markup | undefined = undefined

  const token = getMetadata(presentation.metadata.Token) ?? ''
  const collaboratorURL = getMetadata(document.metadata.CollaboratorUrl) ?? ''
  let editor: CollaboratorEditor
  export function getHTML (): string | undefined {
    return editor.getHTML()
  }
</script>

{#key comparedVersion}
  <CollaboratorEditor
    documentId={object.contentAttachmentId}
    {token}
    {collaboratorURL}
    {readonly}
    on:content
    {initialContentId}
    {comparedVersion}
    bind:this={editor}
  />
{/key}
