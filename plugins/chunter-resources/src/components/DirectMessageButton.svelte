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
  import { ModernButton, getCurrentLocation } from '@hcengineering/ui'
  import view, { decodeObjectURI } from '@hcengineering/view'
  import { Employee } from '@hcengineering/contact'

  import chunter from '../plugin'
  import { createDirect } from '../utils'
  import { openChannelInSidebar } from '../navigation'

  export let employee: Employee

  async function openDirect (): Promise<void> {
    const dm = await createDirect([employee._id])
    if (dm === undefined) {
      return
    }

    const loc = getCurrentLocation()
    const [_id] = decodeObjectURI(loc.path[3]) ?? []

    if (_id === dm) {
      return
    }

    await openChannelInSidebar(dm, chunter.class.DirectMessage, undefined, undefined, true)
  }
</script>

<ModernButton label={chunter.string.Message} icon={view.icon.Bubble} size="small" iconSize="small" on:click={openDirect}/>
