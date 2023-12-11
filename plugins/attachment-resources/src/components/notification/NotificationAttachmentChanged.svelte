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
  import { DocUpdateMessage } from '@hcengineering/notification'
  import { Attachment } from '@hcengineering/attachment'

  import AttachmentPresenter from '../AttachmentPresenter.svelte'
  import RemovedAttachmentPresenter from '../RemovedAttachmentPresenter.svelte'

  export let message: DocUpdateMessage
  export let value: Attachment | undefined
</script>

{#if value}
  {#if message.action === 'remove'}
    <RemovedAttachmentPresenter {value} />
  {:else}
    <AttachmentPresenter {value} />
  {/if}
{/if}
