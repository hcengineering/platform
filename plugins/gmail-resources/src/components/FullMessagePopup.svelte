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
  import { SharedMessage } from '@anticrm/gmail'
  import { Label } from '@anticrm/ui'
  import gmail from '../plugin'
  import FullMessageContent from './FullMessageContent.svelte'

  export let message: SharedMessage

  $: title = message.incoming ? message.sender : message.receiver
  $: user = message.incoming ? message.receiver : message.sender
</script>

<div class="popup flex-col">
  <div class="fs-title mb-4">
    {message.subject}
  </div>
  <div>
    <Label label={message.incoming ? gmail.string.From : gmail.string.To} />
    {title}
  </div>
  <div>
    <Label label={message.incoming ? gmail.string.To : gmail.string.From} />
    {user}
  </div>
  {#if message.copy?.length}
    <Label label={gmail.string.Copy} />: {message.copy.join(', ')}
  {/if}
  <div class="flex-col clear-mins mt-5">
    <FullMessageContent content={message.content} />
  </div>
</div>

<style lang="scss">
  .popup {
    padding: 1rem;
    max-height: 500px;
    background-color: var(--theme-button-bg-focused);
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: .75rem;
    box-shadow: 0px 10px 20px rgba(0, 0, 0, .2);
  }
</style>
