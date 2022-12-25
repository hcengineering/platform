<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { getClient } from '@hcengineering/presentation'
  import { Request } from '@hcengineering/request'
  import { getPanelURI, Label } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import TxView from './TxView.svelte'

  export let value: Request
  export let inline: boolean = false

  const client = getClient()
  $: label = client.getHierarchy().getClass(value._class).label
</script>

<div class="flex">
  <a
    class="flex-presenter mr-1"
    class:inline-presenter={inline}
    href="#{getPanelURI(view.component.EditDoc, value._id, value._class, 'content')}"
  >
    <span class="label nowrap">
      <Label {label} />
    </span>
  </a>
  <TxView tx={value.tx} />
</div>
