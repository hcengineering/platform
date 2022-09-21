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
  import { getClient } from '@hcengineering/presentation'
  import { AnyComponent, Component } from '@hcengineering/ui'
  import view from '../plugin'

  export let link: HTMLLinkElement

  const client = getClient()

  async function getPresenter (href: string): Promise<AnyComponent | undefined> {
    const presenters = await client.findAll(view.class.LinkPresenter, {})
    for (const presenter of presenters) {
      if (new RegExp(presenter.pattern).test(href)) {
        return presenter.component
      }
    }
  }
</script>

{#await getPresenter(link.href) then presenter}
  {#if presenter}
    <Component is={presenter} props={{ href: link.href }} />
  {/if}
{/await}
