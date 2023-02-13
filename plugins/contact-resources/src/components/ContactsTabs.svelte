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
  import contact from '@hcengineering/contact'
  import { IntlString } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { AnyComponent, Component, Tabs } from '@hcengineering/ui'

  const client = getClient()

  let tabs: { component: AnyComponent; label: IntlString; props: any }[] | undefined

  client
    .findAll(contact.class.ContactsTab, {})
    .then(
      (ts) =>
        (tabs = ts
          .sort((a, b) => (a.index > b.index ? 1 : (a.index < b.index && -1) || 0))
          .map((t) => ({ component: t.component, label: t.label, props: {} })))
    )
</script>

{#if tabs && tabs.length > 1}
  <div class="flex-col p-4 flex-grow">
    <Tabs model={tabs} />
  </div>
{:else if tabs?.[0]}
  <Component is={tabs[0].component} />
{/if}
