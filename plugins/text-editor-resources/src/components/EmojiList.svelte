<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2022, 2023, 2024 Hardcore Engineering Inc.
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
  import EmojiPopup from './EmojiPopup.svelte'
  import Popup from './Popup.svelte'

  export let query = ''
  export let clientRect: () => ClientRect
  export let command: (props: any) => void
  export let close: () => void

  let searchPopup: EmojiPopup

  function dispatchItem(item?: { id: string; objectclass: string }): void {
    if (item == null) {
      close()
    } else {
      command(item)
    }
  }

  export function onKeyDown(ev: KeyboardEvent): boolean {
    return searchPopup.onKeyDown(ev)
  }
</script>

<Popup {query} {clientRect} {command} {close}>
  <EmojiPopup
    bind:this={searchPopup}
    {query}
    on:close={(evt) => {
      dispatchItem(evt.detail)
    }}
  />
</Popup>
