<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
import {
  Button,
  showPopup
} from '@hcengineering/ui'

import SelectTestCases from './SelectTestCases.svelte'

let opened: boolean = false
export let selected: ListItem | undefined = undefined

const _click = (ev: MouseEvent): void => {
  if (!opened) {
    opened = true
    showPopup(SelectTestCases, { title: label, items, icon, withSearch }, container, (result) => {
      if (result) {
        selected = result
        dispatch('selected', result)
      }
      opened = false
      mgr?.setFocusPos(focusIndex)
    })
  }
}
</script>

<Button on:click={_click}>
  <span slot="content" class="overflow-label flex-grow">
    {'Select Test Cases'}
  </span>
</Button>
