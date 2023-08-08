<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Employee, PersonAccount } from '@hcengineering/contact'
  import { Ref } from '@hcengineering/core'
  import contact from '../plugin'
  import { personAccountByIdStore } from '../utils'
  import CombineAvatars from './CombineAvatars.svelte'

  export let value: Ref<PersonAccount>[]

  $: employees = value
    .map((p) => $personAccountByIdStore.get(p)?.person)
    .filter((p) => p !== undefined) as Ref<Employee>[]
</script>

<CombineAvatars _class={contact.mixin.Employee} items={employees} limit={5} size={'x-small'} />
