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
  import { Doc } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Request } from '@hcengineering/request'
  import { Label } from '@hcengineering/ui'
  import { DocNavLink, ObjectPresenter } from '@hcengineering/view-resources'
  import requests from '../plugin'
  import RequestLabel from './RequestLabel.svelte'

  export let value: Request
  let doc: Doc | undefined = undefined

  const query = createQuery()
  query.query(value.attachedToClass, { _id: value.attachedTo }, (res) => {
    ;[doc] = res
  })
</script>

<div class="inline-presenter">
  <RequestLabel {value} size={'inline'} />
  <span class="lower mx-1">
    <Label label={requests.string.For} />
  </span>
  {#if doc}
    <DocNavLink object={doc}>
      <ObjectPresenter value={doc} />
    </DocNavLink>
  {/if}
</div>
