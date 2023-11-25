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
  import { Message } from '@hcengineering/gmail'
  import { getClient } from '@hcengineering/presentation'
  import { showPopup } from '@hcengineering/ui'
  import Main from '../Main.svelte'

  export let value: Message

  async function click () {
    const client = getClient()
    const channel = await client.findOne(value.attachedToClass, { _id: value.attachedTo })
    if (channel !== undefined) {
      showPopup(Main, { _id: channel.attachedTo, _class: channel.attachedToClass, message: value }, 'float')
    }
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<span class="over-underline overflow-label" on:click={click}>{value.subject}</span>
