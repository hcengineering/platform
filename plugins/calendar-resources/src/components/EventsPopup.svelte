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
  import type { Event } from '@anticrm/calendar'
  import { Class, Doc, DocumentQuery, FindOptions, Ref } from '@anticrm/core'
  import { Table } from '@anticrm/view-resources'

  export let value: Event[]

  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Event> = {}
  export let options: FindOptions<Event> | undefined = undefined
  export let baseMenuClass: Ref<Class<Event>> | undefined = undefined
  export let config: string[]
</script>

<Table
  {_class}
  {config}
  {baseMenuClass}
  {options}
  query={{ ...query, _id: { $in: value.map((it) => it._id) } }}
  loadingProps={{ length: value.length ?? 0 }}
/>
