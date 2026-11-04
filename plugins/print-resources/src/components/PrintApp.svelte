<!--
//
// Copyright © 2026 TraceX SAS.
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
//
-->
<script lang="ts">
  import { Analytics } from '@hcengineering/analytics'
  import { getMetadata } from '@hcengineering/platform'
  import presentation, { providePrintContext } from '@hcengineering/presentation'
  import { Label, Loading, Notifications, provideRenderContext } from '@hcengineering/ui'
  import workbench from '@hcengineering/workbench'
  import { onDestroy } from 'svelte'
  import { connect, disconnect } from '../connect'
  import Print from './Print.svelte'

  provideRenderContext(providePrintContext())
  const connection = connect(getMetadata(workbench.metadata.PlatformTitle) ?? 'Platform')
  onDestroy(() => {
    void disconnect().catch(Analytics.handleError)
  })
</script>

{#await connection}
  <div class="flex-center w-full h-full"><Loading shrink /></div>
{:then target}
  <Notifications><Print {target} /></Notifications>
{:catch}
  <div data-print-root data-print-state="error">
    <Label label={presentation.string.AccessDenied} />
  </div>
{/await}
