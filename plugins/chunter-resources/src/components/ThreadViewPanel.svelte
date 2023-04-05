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
  import { Message } from '@hcengineering/chunter'
  import ThreadView from './ThreadView.svelte'
  import { Ref, Space } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import chunter from '../plugin'

  export let _id: Ref<Message>
  let space: Ref<Space> | undefined = undefined

  const query = createQuery()
  $: query.query(chunter.class.Message, { _id }, (res) => {
    space = res[0].space
  })
</script>

<div class="antiPanel-component">
  {#if space}
    <ThreadView {_id} currentSpace={space} />
  {/if}
</div>
