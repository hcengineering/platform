<!--
// Copyright © 2023, 2024 Hardcore Engineering Inc.
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
  import { Ref, SortingOrder } from '@hcengineering/core'
  import { Label, Scroller } from '@hcengineering/ui'
  import { createQuery } from '@hcengineering/presentation'
  import documents, { DocumentApprovalRequest, DocumentReviewRequest } from '@hcengineering/controlled-documents'
  import { employeeByIdStore } from '@hcengineering/contact-resources'
  import { Employee, Person, formatName } from '@hcengineering/contact'
  import { IntlString } from '@hcengineering/platform'

  import documentsRes from '../../plugin'
  import { $controlledDocument as controlledDocument } from '../../stores/editors/document/editor'
  import { formatSignatureDate } from '../../utils'

  interface Signer {
    id?: Ref<Person>
    role: 'author' | 'reviewer' | 'approver'
    name: string
    date: string
  }

  let signers: Signer[] = []

  let reviewRequest: DocumentReviewRequest
  let approvalRequest: DocumentApprovalRequest

  const reviewQuery = createQuery()
  const approvalQuery = createQuery()

  $: if ($controlledDocument !== undefined) {
    reviewQuery.query(
      documents.class.DocumentReviewRequest,
      {
        attachedTo: $controlledDocument?._id,
        attachedToClass: $controlledDocument?._class
      },
      (res) => {
        reviewRequest = res[0]
      },
      {
        sort: { createdOn: SortingOrder.Descending },
        limit: 1
      }
    )

    approvalQuery.query(
      documents.class.DocumentApprovalRequest,
      {
        attachedTo: $controlledDocument?._id,
        attachedToClass: $controlledDocument?._class
      },
      (res) => {
        approvalRequest = res[0]
      },
      {
        sort: { createdOn: SortingOrder.Descending },
        limit: 1
      }
    )
  } else {
    reviewQuery.unsubscribe()
    approvalQuery.unsubscribe()
  }

  $: if ($controlledDocument !== null) {
    const getNameByEmployeeId = (id: Ref<Person> | undefined): string => {
      if (id === undefined) {
        return ''
      }

      const employee = $employeeByIdStore.get(id as Ref<Employee>)
      const rawName = employee?.name

      return rawName !== undefined ? formatName(rawName) : ''
    }

    const authorSignDate = reviewRequest !== undefined
      ? reviewRequest.createdOn
      : (approvalRequest !== undefined ? approvalRequest.createdOn : $controlledDocument.createdOn)

    signers = [
      {
        id: $controlledDocument.author,
        role: 'author',
        name: getNameByEmployeeId($controlledDocument.author),
        date: authorSignDate !== undefined ? formatSignatureDate(authorSignDate) : ''
      }
    ]

    if (reviewRequest !== undefined) {
      reviewRequest.approved.forEach((reviewer, idx) => {
        const date = reviewRequest.approvedDates?.[idx]

        signers.push({
          id: reviewer,
          role: 'reviewer',
          name: getNameByEmployeeId(reviewer),
          date: formatSignatureDate(date ?? reviewRequest.modifiedOn)
        })
      })
    }

    if (approvalRequest !== undefined) {
      approvalRequest.approved.forEach((approver, idx) => {
        const date = approvalRequest.approvedDates?.[idx]

        signers.push({
          id: approver,
          role: 'approver',
          name: getNameByEmployeeId(approver),
          date: formatSignatureDate(date ?? approvalRequest.modifiedOn)
        })
      })
    }
  }

  function getSignerLabel (role: 'author' | 'reviewer' | 'approver'): IntlString {
    switch (role) {
      case 'author':
        return documentsRes.string.Author
      case 'reviewer':
        return documentsRes.string.Reviewer
      case 'approver':
        return documentsRes.string.Approver
    }
  }
</script>

<Scroller>
  <div class="root">
    <div class="flex-col list">
      {#each signers as signer}
        <div class="row flex-row-top px-4">
          <div class="flex-col col">
            <div class="fs-title text-normal version">
              <Label label={getSignerLabel(signer.role)} />
            </div>

            <div class="date">
              {signer.date}
            </div>
          </div>
          <div class="flex-col">
            <div class="name">
              {signer.name}
            </div>
            <div class="code">
              {signer.id}
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
</Scroller>

<style lang="scss">
  .list {
    gap: 3rem;
  }

  .col {
    flex: 0 0 6rem;
  }

  .row {
    gap: 3rem;
    @media print {
      border-left: 2px solid var(--theme-divider-color);
    }
  }

  .version {
    line-height: 1.25rem;
  }

  .date {
    font-size: 0.6875rem;
    color: var(--theme-dark-color);
    line-height: 1rem;
  }

  .name {
    line-height: 1.25rem;
    font-weight: 500;
  }

  .code {
    font-size: 0.6875rem;
  }
</style>
