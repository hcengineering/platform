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
  import { Person } from '@anticrm/contact'
  import { Ref, RefTo } from '@anticrm/core'
  import { IntlString } from '@anticrm/platform'
  import { UserBox } from '@anticrm/presentation'
  import contact from '../plugin'

  export let value: Ref<Person> | undefined
  export let label: IntlString = contact.string.Person
  export let onChange: (value: any) => void
  export let type: RefTo<Person> | undefined

  $: _class = type?.to ?? contact.class.Person
</script>

<UserBox {_class} {label} kind={'link'} size={'large'} bind:value on:change={onChange} />
