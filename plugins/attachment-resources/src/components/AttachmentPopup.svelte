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
  import type { Doc, Ref } from '@hcengineering/core'
  import { DocNavLink, ObjectPresenter, Table } from '@hcengineering/view-resources'

  import { Label } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import attachment from '../plugin'

  export let objectId: Ref<Doc>
  export let attachments: number
  export let object: Doc
</script>

<div class="flex flex-between flex-grow p-1 mb-4">
  <div class="fs-title">
    <Label label={attachment.string.Attachments} />
  </div>
  <DocNavLink {object}>
    <ObjectPresenter _class={object._class} objectId={object._id} value={object} />
  </DocNavLink>
</div>
<Table
  _class={attachment.class.Attachment}
  config={[
    '',
    'description',
    {
      key: 'pinned',
      presenter: view.component.BooleanTruePresenter,
      label: attachment.string.Pinned,
      sortingKey: 'pinned'
    },
    'lastModified'
  ]}
  options={{ sort: { pinned: -1 } }}
  query={{ attachedTo: objectId }}
  loadingProps={{ length: attachments }}
/>
