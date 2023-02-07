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
  import { getClient } from '@hcengineering/presentation'
  import { TabModel, Tabs } from '@hcengineering/ui'
  import contact from '@hcengineering/contact'

  import plugin from '../plugin'
  import Contacts from './Contacts.svelte'

  const client = getClient()

  let tabs: TabModel | undefined

  client.findAll(contact.class.ContactsTab, {}).then(
    (ts) =>
      ts.length &&
      (tabs = [
        {
          component: Contacts,
          label: plugin.string.Contacts,
          props: {}
        },
        ...ts.sort((a, b) => (a.index > b.index ? 1 : (a.index < b.index && -1) || 0)).map((t) => t.tab)
      ])
  )
</script>

{#if tabs}
  <div class="pl-2">
    <Tabs model={tabs} />
  </div>
{:else}
  <Contacts />
{/if}
