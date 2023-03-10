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
  import { SharedMessages } from '@hcengineering/gmail'
  import { showPopup } from '@hcengineering/ui'
  import FullMessagePopup from './FullMessagePopup.svelte'
  import Messages from './Messages.svelte'

  export let value: SharedMessages

  function selectHandler (e: CustomEvent) {
    const message = e.detail
    showPopup(FullMessagePopup, {
      message
    })
  }
</script>

<div class="container">
  <Messages messages={value.messages} on:select={selectHandler} />
</div>

<style lang="scss">
  .container {
    padding: 1rem;
    background-color: var(--accent-bg-color);
    border: 1px solid var(--divider-color);
    border-radius: 0.75rem;
  }
</style>
