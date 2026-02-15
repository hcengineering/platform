<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { ApproveRequest } from '@hcengineering/process'
  import { getUserTimezone, tooltip } from '@hcengineering/ui'
  import { BooleanPresenter } from '@hcengineering/view-resources'

  export let value: ApproveRequest

  export function formatSignatureDate (date: number): string {
    const timeZone: string = getUserTimezone()

    return new Date(date).toLocaleDateString('default', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone,
      timeZoneName: 'short',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    })
  }
</script>

<div
  use:tooltip={value.approved !== undefined
    ? { label: getEmbeddedLabel(value.user + ' ' + formatSignatureDate(value.modifiedOn)) }
    : undefined}
>
  <BooleanPresenter value={value.approved} />
</div>
