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
  import contact, { Person } from '@hcengineering/contact'
  import { getPersonRefsByPersonIdsCb, PersonRefPresenter } from '@hcengineering/contact-resources'
  import { Ref } from '@hcengineering/core'
  import { createQuery, MessageViewer } from '@hcengineering/presentation'
  import { Request, RequestDecisionComment } from '@hcengineering/request'
  import { BooleanIcon, Label, ShowMore } from '@hcengineering/ui'
  import request from '../plugin'

  export let value: Request
  let comments: RequestDecisionComment[] = []
  let commentsByPersonRefs = new Map<Ref<Person> | undefined, RequestDecisionComment>()

  const query = createQuery()
  $: query.query(request.mixin.RequestDecisionComment, { attachedTo: value._id }, (res) => {
    comments = res
  })
  $: getPersonRefsByPersonIdsCb(
    comments.map((it) => it.modifiedBy),
    (res) => {
      commentsByPersonRefs = new Map(
        comments.map((c) => {
          const personRef = res.get(c.modifiedBy)
          return [personRef, c]
        })
      )
    }
  )

  interface RequestDecision {
    employee: Ref<Person>
    decision?: boolean
    comment?: RequestDecisionComment
  }

  function convert (value: Request, comments: Map<Ref<Person> | undefined, RequestDecisionComment>): RequestDecision[] {
    const res: RequestDecision[] = []
    for (const emp of value.requested) {
      const decision = value.rejected === emp ? false : value.approved.includes(emp) ? true : undefined
      const result: RequestDecision = {
        employee: emp,
        decision
      }
      if (decision !== undefined) {
        result.comment = comments.get(emp)
      }
      res.push(result)
    }
    return res
  }
</script>

<table class="antiTable">
  <thead class="scroller-thead">
    <tr class="scroller-thead__tr">
      <th><Label label={contact.string.Employee} /></th>
      <th><Label label={request.string.Approved} /></th>
      <th><Label label={request.string.Comment} /></th>
    </tr>
  </thead>
  <tbody>
    {#each convert(value, commentsByPersonRefs) as requested}
      <tr class="antiTable-body__row">
        <td><PersonRefPresenter value={requested.employee} /></td>
        <td><BooleanIcon value={requested.decision} /></td>
        <td>
          {#if requested.comment}
            <ShowMore limit={126} fixed>
              <MessageViewer message={requested.comment.message} />
            </ShowMore>{/if}
        </td>
      </tr>
    {/each}
  </tbody>
</table>

<style lang="scss">
  .antiTable {
    th,
    td {
      &:first-child {
        padding-left: 1.5rem;
      }
      &:last-child {
        padding-right: 1.5rem;
      }
    }
  }
</style>
