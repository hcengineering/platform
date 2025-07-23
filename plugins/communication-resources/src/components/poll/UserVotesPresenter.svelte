<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
  import { UserVote } from '@hcengineering/communication'
  import { employeeByAccountStore, CombineAvatars } from '@hcengineering/contact-resources'
  import { notEmpty } from '@hcengineering/core'
  import contact from '@hcengineering/contact'

  export let value: UserVote[]

  $: employees = value.map((it) => $employeeByAccountStore.get(it.account)?._id).filter(notEmpty)
</script>

<CombineAvatars _class={contact.class.Person} items={employees} limit={5} size="card" />
