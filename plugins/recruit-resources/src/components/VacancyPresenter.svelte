<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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
  import type { Vacancy } from '@anticrm/recruit'
  import {
    ActionIcon,
    getCurrentLocation,
    Icon,
    IconEdit,
    Location,
    locationToUrl,
    navigate,
    showPanel
  } from '@anticrm/ui'
  import recruit from '../plugin'

  export let value: Vacancy
  export let inline: boolean = false

  function editVacancy (): void {
    showPanel(recruit.component.EditVacancy, value._id, value._class, 'content')
  }

  function getLoc (): Location {
    const loc = getCurrentLocation()
    loc.path[3] = value._id
    loc.path.length = 4
    return loc
  }

  function getLink (): string {
    const loc = getLoc()
    return document.location.origin + locationToUrl(loc)
  }
</script>

{#if value}
  <div class="flex-presenter" class:inline-presenter={inline}>
    <div class="icon">
      <Icon icon={recruit.icon.Vacancy} size={'small'} />
    </div>
    <a
      on:click|preventDefault={(e) => {
        navigate(getLoc())
        e.preventDefault()
      }}
      href={getLink()}
    >
      <span class="label">{value.name}</span>
    </a>
    <div class="action">
      <ActionIcon label={recruit.string.Edit} size={'small'} icon={IconEdit} action={editVacancy} />
    </div>
  </div>
{/if}
