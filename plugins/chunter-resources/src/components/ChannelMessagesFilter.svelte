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
  import { Button, eventToHTMLElement, IconFilter, showPopup } from '@hcengineering/ui'
  import { Ref } from '@hcengineering/core'
  import activity, { ActivityMessagesFilter } from '@hcengineering/activity'
  import { getClient } from '@hcengineering/presentation'
  import { ActivityMessagesFilterPopup } from '@hcengineering/activity-resources'

  export let selectedFilters: Ref<ActivityMessagesFilter>[] = []

  const client = getClient()
  const filters = client.getModel().findAllSync(activity.class.ActivityMessagesFilter, {})

  const handleClick = (ev: MouseEvent): void => {
    showPopup(
      ActivityMessagesFilterPopup,
      { filters, showToggle: false },
      eventToHTMLElement(ev),
      () => {},
      (res) => {
        if (res === undefined) return
        if (res.action === 'toggle') {
          return
        }
        selectedFilters = (Array.isArray(res.value) ? res.value : [res.value]) as Ref<ActivityMessagesFilter>[]
      }
    )
  }
</script>

<Button icon={IconFilter} iconProps={{ size: 'small' }} kind="icon" on:click={handleClick} />
