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
  import { Breadcrumbs, Header, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'
  import { IntlString } from '@hcengineering/platform'

  import { CalendarMode } from '../index'
  import CalendarNavigation from './CalendarNavigation.svelte'

  export let currentDate: Date
  export let ddItems: {
    id: string | number
    label: IntlString
    mode: CalendarMode
    params?: Record<string, any>
  }[] = []
  export let mode: CalendarMode
  export let monthName: string
  export let onToday: () => void
  export let onBack: () => void
  export let onForward: () => void
</script>

<Header
  allowFullsize={false}
  type="type-aside"
  hideBefore={true}
  hideActions={false}
  hideDescription={true}
  hideExtra={false}
  adaptive="autoExtra"
  doubleRowWidth={350}
  closeOnEscape={false}
  topIndent={$deviceInfo.navigator.float && !$deviceInfo.aside.float}
  on:close
>
  <div class="title">
    <Breadcrumbs
      items={[
        {
          title: `${monthName} ${currentDate.getFullYear()}`
        }
      ]}
      currentOnly
    />
  </div>

  <svelte:fragment slot="extra">
    <CalendarNavigation {ddItems} {mode} {onToday} {onBack} {onForward} />
  </svelte:fragment>
</Header>
