<!--
// Copyright © 2020 Anticrm Platform Contributors.
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

  import type { Ref } from '@anticrm/core'
  import type { Application } from '@anticrm/workbench'
  import { getCurrentLocation, navigate } from '@anticrm/ui'
  import { createQuery } from '@anticrm/presentation'
  import workbench from '@anticrm/workbench'

  import AppItem from './AppItem.svelte'

  export let active: Ref<Application> | undefined

  let apps: Application[] = []

  const query = createQuery()  
  $: query.query(workbench.class.Application, {}, result => { apps = result })

  function navigateApp(app: Ref<Application>) {
    const loc = getCurrentLocation()
    loc.path[1] = app
    loc.path.length = 2
    navigate(loc)
  }

</script>

<div class="flex flex-col">
  {#each apps as app}
    <AppItem selected={app._id === active} icon={app.icon} label={app.label} notify action={async () => {navigateApp(app._id)}}/>
  {/each}
</div>
