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
  import { Class, Ref } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
import { ActionIcon, IconClose } from '@anticrm/ui';
import TimestampPresenter from '@anticrm/view-resources/src/components/TimestampPresenter.svelte';
  import filesize from 'filesize'
  import { createEventDispatcher } from 'svelte'
  import AttachmentPreview from './AttachmentPreview.svelte'

  export let _id: Ref<Attachment>
  export let _class: Ref<Class<Attachment>>

  const dispatch = createEventDispatcher()
  let value: Attachment
  const query = createQuery()
  $: query.query(_class, { _id }, (result) => {
    value = result[0]
  }, { limit: 1 })

</script>

<div class="antiOverlay" on:click={() => { dispatch('close') }} />
<div class="antiDialogs antiComponent">
  {#if value}
  <div class="ac-header short mirror">
    <div class="ac-header__wrap-title">
      <span class="ac-header__title">{value.name}</span>
    </div>
    <ActionIcon icon={IconClose} size={'medium'} action={() => dispatch('close')} />
  </div>
    <div>{filesize(value.size)}</div>
    <div><TimestampPresenter value={value.modifiedOn}/></div>
    <AttachmentPreview {value}/>
  {/if}
</div>
