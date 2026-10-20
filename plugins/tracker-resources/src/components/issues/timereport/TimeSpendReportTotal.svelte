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
  import { Doc, DocumentQuery } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { TimeSpendReport } from '@hcengineering/tracker'
  import { floorFractionDigits } from '@hcengineering/ui'
  import tracker from '../../../plugin'
  import TimePresenter from './TimePresenter.svelte'

  // Query of the list category (view query + group keys), provided by the list header.
  export let categoryQuery: DocumentQuery<Doc> | undefined = undefined

  const query = createQuery()
  let total: number | undefined = undefined

  $: if (categoryQuery !== undefined) {
    query.query(
      tracker.class.TimeSpendReport,
      categoryQuery as DocumentQuery<TimeSpendReport>,
      (res) => {
        total = floorFractionDigits(
          res.reduce((sum, it) => sum + (it.value ?? 0), 0),
          3
        )
      },
      { projection: { _id: 1, value: 1 } }
    )
  } else {
    query.unsubscribe()
    total = undefined
  }
</script>

{#if total !== undefined}
  <TimePresenter value={total} accent />
{/if}
