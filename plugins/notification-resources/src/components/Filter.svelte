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
  import { Button, IconFilter, SelectPopup, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import notification from '../plugin'

  export let filter: 'all' | 'read' | 'unread' = 'all'

  $: filters = [
    {
      id: 'all',
      isSelected: filter === 'all',
      label: notification.string.All
    },
    {
      id: 'read',
      isSelected: filter === 'read',
      label: notification.string.Read
    },
    {
      id: 'unread',
      isSelected: filter === 'unread',
      label: notification.string.Unread
    }
  ]

  function click (e: MouseEvent) {
    showPopup(SelectPopup, { value: filters }, eventToHTMLElement(e), (res) => {
      if (res) {
        filter = res
      }
    })
  }
</script>

<Button icon={IconFilter} on:click={click} />
