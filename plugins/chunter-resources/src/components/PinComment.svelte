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
  import { ActionIcon } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'
  import { type Comment } from '@hcengineering/chunter'
  import view from '@hcengineering/view'

  export let object: Comment | undefined = undefined

  const client = getClient()

  async function pinComment (ev: Event): Promise<void> {
    if (object !== undefined) {
      await client.update(object, { pinned: !object?.pinned })
    }
  }
</script>

<ActionIcon
  icon={view.icon.Pin}
  iconProps={object?.pinned === true ? { fill: '#3265cb' } : undefined}
  size="medium"
  action={pinComment}
/>
