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
  import { getUserTimezone } from '@hcengineering/ui'

  export let date: number
  export let timeZone: string = getUserTimezone()

  const current = new Date()
  let options: Intl.DateTimeFormatOptions = {
    timeZone,
    day: 'numeric',
    weekday: 'short',
    month: 'short'
  }
  $: options = {
    ...options,
    timeZone,
    year: current.getFullYear() !== new Date(date).getFullYear() ? '2-digit' : undefined
  }
</script>

{new Date(date).toLocaleDateString('default', options)}
