<!--
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
-->
<script lang="ts">
  import { Attachment } from '@anticrm/attachment'
  import core, { Class, Ref } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import { ObjectPresenter, TimestampPresenter } from '@anticrm/view-resources'
  import filesize from 'filesize'
  import { Panel } from '@anticrm/panel'
  import { createEventDispatcher } from 'svelte'
  import AttachmentPreview from './AttachmentPreview.svelte'
  import attachment from '../plugin'
  import { trimFilename } from '../utils'

  export let _id: Ref<Attachment>
  export let _class: Ref<Class<Attachment>>

  const dispatch = createEventDispatcher()
  let object: Attachment
  const query = createQuery()
  $: query.query(
    _class,
    { _id },
    (result) => {
      object = result[0]
    },
    { limit: 1 }
  )
</script>

{#if object}
  <Panel
    icon={attachment.icon.Attachment}
    title={trimFilename(object.name, 55)}
    {object}
    rightSection={attachment.component.Detail}
    isHeader={false}
    isAside={false}
    on:close={() => {
      dispatch('close')
    }}
  >
    <div class="flex-col">
      <div class="mt-4"><ObjectPresenter objectId={object.space} _class={core.class.Space} value={undefined} /></div>
      <div class="mt-2"><TimestampPresenter value={object.modifiedOn} /></div>
      <div class="mt-2 mb-4">{filesize(object.size)}</div>
      <AttachmentPreview value={object} />
    </div>
  </Panel>
{/if}
