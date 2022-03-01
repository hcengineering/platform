
<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { Comment } from '@anticrm/chunter'
  import { Doc, generateId, Ref } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import { AttachmentRefInput } from '@anticrm/attachment-resources'
  import { createBacklinks } from '../backlinks'
  import chunter from '../plugin'

  const client = getClient()
  export let object: Doc
  const _class = chunter.class.Comment
  let _id: Ref<Comment> = generateId()
  
  async function onMessage (event: CustomEvent) {
    const { message, attachments } = event.detail
    await client.addCollection<Doc, Comment>(_class, object.space, object._id, object._class, 'comments', { message, attachments }, _id)

    // Create an backlink to document
    await createBacklinks(client, object._id, object._class, _id, message)
    _id = generateId()
  }

</script>
<AttachmentRefInput {_class} space={object.space} objectId={_id} on:message={onMessage}/>