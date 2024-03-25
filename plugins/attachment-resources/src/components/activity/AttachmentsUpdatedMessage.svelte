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
  import { DocUpdateMessage } from '@hcengineering/activity'
  import { Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Attachment } from '@hcengineering/attachment'
  import { getOrBuildObject } from '@hcengineering/view-resources'

  import attachment from '../../plugin'
  import AttachmentPresenter from '../AttachmentPresenter.svelte'
  import AttachmentName from '../AttachmentName.svelte'

  export let message: DocUpdateMessage
  export let _id: Ref<Attachment>
  export let value: Attachment | undefined = undefined
  export let preview = false

  const client = getClient()

  $: value === undefined &&
    getOrBuildObject<Attachment>(client, _id, attachment.class.Attachment).then((res) => {
      value = res
    })
</script>

{#if preview || message.action === 'remove'}
  <AttachmentName {value} />
{:else}
  <AttachmentPresenter {value} />
{/if}
