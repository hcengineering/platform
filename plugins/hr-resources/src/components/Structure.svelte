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
  import { DocumentQuery, Ref } from '@anticrm/core'
  import { Button, Icon, Label, Scroller, SearchEdit, showPopup, IconAdd, eventToHTMLElement } from '@anticrm/ui'
  import type { Department } from '@anticrm/hr'
  import hr from '../plugin'
  import CreateDepartment from './CreateDepartment.svelte'
  import DepartmentCard from './DepartmentCard.svelte'
  import { createQuery } from '@anticrm/presentation'
  import contact from '@anticrm/contact'

  let search = ''
  let resultQuery: DocumentQuery<Department> = {}

  function updateResultQuery (search: string): void {
    resultQuery = search === '' ? {} : { $search: search }
  }

  function showCreateDialog (ev: MouseEvent) {
    showPopup(CreateDepartment, {}, eventToHTMLElement(ev))
  }

  const query = createQuery()

  let descendants: Map<Ref<Department>, Department[]> = new Map<Ref<Department>, Department[]>()
  let head: Department | undefined

  query.query(
    hr.class.Department,
    resultQuery,
    (res) => {
      head = res.find((p) => p._id === hr.ids.Head)
      descendants.clear()
      for (const doc of res) {
        const current = descendants.get(doc.space)
        if (!current) {
          descendants.set(doc.space, [doc])
        } else {
          current.push(doc)
          descendants.set(doc.space, current)
        }
      }
      descendants = descendants
    },
    {
      lookup: {
        teamLead: contact.class.Employee
      }
    }
  )
</script>

<div class="ac-header full divide">
  <div class="ac-header__wrap-title">
    <div class="ac-header__icon"><Icon icon={hr.icon.Structure} size={'small'} /></div>
    <span class="ac-header__title"><Label label={hr.string.Structure} /></span>
  </div>

  <SearchEdit
    bind:value={search}
    on:change={() => {
      updateResultQuery(search)
    }}
  />
  <Button label={hr.string.CreateDepartmentLabel} icon={IconAdd} kind={'primary'} on:click={showCreateDialog} />
</div>

<Scroller>
  {#if head}
    <DepartmentCard value={head} {descendants} />
  {/if}
</Scroller>
