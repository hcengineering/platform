<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import type { Class, Doc, DocumentQuery, FindOptions, Ref, Space } from '@anticrm/core'
  import { ScrollBox } from '@anticrm/ui'
  import Table from './Table.svelte'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined = undefined
  export let query: DocumentQuery<Doc> = {}
  export let options: FindOptions<Doc> | undefined = undefined
  export let baseMenuClass: Ref<Class<Doc>> | undefined = undefined
  export let config: string[]
  export let search: string = ''

  $: query = search === '' ? { space } : { $search: search, space }
</script>

<div class="tableview-container">
  <ScrollBox vertical stretch noShift>
    <Table {_class} {config} {options} {query} {baseMenuClass} enableChecking />
  </ScrollBox>
</div>

<style lang="scss">
  .tableview-container {
    flex-grow: 1;
    margin-bottom: .75rem;
    min-height: 0;
    height: 100%;
  }
</style>
