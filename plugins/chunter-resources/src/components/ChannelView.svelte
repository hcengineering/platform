<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import type { Ref, Space } from '@anticrm/core'
  import { TxOperations } from '@anticrm/core'
  import chunter from '../plugin'
  import { getClient } from '@anticrm/presentation'

  import Channel from './Channel.svelte'
  import { ReferenceInput } from '@anticrm/text-editor'

  export let space: Ref<Space>

  const client = getClient()

  function onMessage(event: CustomEvent) {
    client.createDoc(chunter.class.Message, space, {
      content: event.detail
    })
  }
</script>

<div class="msg-board">
  <Channel {space} />
</div>
<div class="reference">
  <ReferenceInput on:message={onMessage}/>
</div>

<style lang="scss">
  .msg-board {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    margin: 1rem 1rem 0;
    padding: 1.5rem 1.5rem 0px;
    overflow: auto;
  }
  .reference {
    margin: 1.25rem 2.5rem;
  }
</style>
