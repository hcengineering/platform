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
  import { formatName } from '@hcengineering/contact'
  import { Icon, Label } from '@hcengineering/ui'
  import activity, { DocAttributeUpdates } from '@hcengineering/activity'

  import contact from '../../plugin'

  export let value: DocAttributeUpdates

  $: personName = value.set[0]
</script>

{#if typeof personName === 'string'}
  <span class="flex-presenter flex-gap-1">
    <span class="mr-1">
      <Icon icon={contact.icon.Person} size="small" />
    </span>
    <Label label={contact.string.Name} />
    <span class="lower"><Label label={activity.string.Set} /></span>
    <span class="lower"><Label label={activity.string.To} /></span>
    <span class="fs-bold overflow-label">
      {formatName(personName)}
    </span>
  </span>
{/if}
