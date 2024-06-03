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
  import { DocumentTemplateSection } from '@hcengineering/controlled-documents'
  import document from '../plugin'
  import { getClient, MessageBox } from '@hcengineering/presentation'

  export let object: DocumentTemplateSection

  const client = getClient()

  async function deleteSection (): Promise<void> {
    client.removeCollection(
      object._class,
      object.space,
      object._id,
      object.attachedTo,
      object.attachedToClass,
      object.collection
    )
  }
</script>

<MessageBox
  label={document.string.DocTemplateDeleteSectionTitle}
  labelProps={document.string.DocTemplateDeleteSectionTitle}
  message={document.string.DocTemplateDeleteSectionConfirm}
  params={{ section: object.title }}
  action={deleteSection}
  on:close
/>
