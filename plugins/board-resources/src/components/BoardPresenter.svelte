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
  import type { Board } from '@anticrm/board'
  import { getPanelURI, Icon } from '@anticrm/ui'
  import view from '@anticrm/view'
  import board from '../plugin'

  export let value: Board
  export let inline: boolean = false
</script>

{#if value}
  <a
    class="flex-presenter"
    class:inline-presenter={inline}
    href="#{getPanelURI(view.component.EditDoc, value._id, value._class, 'full')}"
  >
    <div class="icon">
      <Icon icon={board.icon.Board} size={'small'} />
    </div>
    <span class="label">{value.name}</span>
  </a>
{/if}
