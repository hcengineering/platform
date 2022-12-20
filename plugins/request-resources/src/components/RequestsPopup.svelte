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
  import { EmployeeAccount } from '@hcengineering/contact'
  import { getCurrentAccount, Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Request, RequestStatus } from '@hcengineering/request'
  import { Label, Scroller } from '@hcengineering/ui'
  import request from '../plugin'
  import RequestView from './RequestView.svelte'

  let requests: Request[] = []
  const me = getCurrentAccount()._id as Ref<EmployeeAccount>
  const query = createQuery()
  query.query(
    request.class.Request,
    {
      requested: me,
      status: RequestStatus.Active
    },
    (res) => (requests = res.filter((p) => !p.approved.includes(me)))
  )
</script>

<div class="notifyPopup">
  <div class="header">
    <span class="fs-title overflow-label"><Label label={request.string.Requests} /></span>
  </div>
  <Scroller>
    <div class="px-4 clear-mins">
      {#each requests as request (request._id)}
        <RequestView value={request} />
      {/each}
    </div>
  </Scroller>
</div>
