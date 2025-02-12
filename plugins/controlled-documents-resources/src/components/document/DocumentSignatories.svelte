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
  import { Employee, Person, formatName } from '@hcengineering/contact'
  import { employeeByIdStore, personIdByAccountId } from '@hcengineering/contact-resources'
  import documents, {
    DocumentRequest,
    emptyBundle,
    extractValidationWorkflow
  } from '@hcengineering/controlled-documents'
  import { Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Label, Scroller } from '@hcengineering/ui'

  import documentsRes from '../../plugin'
  import {
    $controlledDocument as controlledDocument,
    $documentSnapshots as documentSnapshots
  } from '../../stores/editors/document/editor'
  import { formatSignatureDate } from '../../utils'

  let requests: DocumentRequest[] = []

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: doc = $controlledDocument

  $: if (doc) {
    void client.findAll(documents.class.DocumentRequest, { attachedTo: doc._id }).then((r) => {
      requests = r
    })
  }

  $: workflow = extractValidationWorkflow(
    hierarchy,
    {
      ...emptyBundle(),
      ControlledDocument: doc ? [doc] : [],
      DocumentRequest: requests,
      DocumentSnapshot: $documentSnapshots
    },
    (ref) => $personIdByAccountId.get(ref)
  )

  $: state = (doc ? workflow?.get(doc._id) ?? [] : [])[0]
  $: signers = (state?.approvals ?? [])
    .filter((a) => a.state === 'approved')
    .map((a) => {
      return {
        person: a.person,
        role: a.role,
        name: getNameByEmployeeId(a.person),
        date: a.timestamp ? formatSignatureDate(a.timestamp) : ''
      }
    })

  function getNameByEmployeeId (id: Ref<Person> | undefined): string {
    if (id === undefined) return ''

    const employee = $employeeByIdStore.get(id as Ref<Employee>)
    const rawName = employee?.name

    return rawName !== undefined ? formatName(rawName) : ''
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
              {signer.person}
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
