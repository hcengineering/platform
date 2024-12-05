<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { IModeSelector, ModeSelector, resolvedLocationStore } from '@hcengineering/ui'
  import { IntlString } from '@hcengineering/platform'

  import { getCurrentMode, onModeChanged } from '../../navigation'

  export let modes: [string, IntlString, object][]

  let mode: string | undefined = undefined
  let modeSelectorProps: IModeSelector | undefined = undefined
  $: mode = getCurrentMode($resolvedLocationStore)

  $: if (mode === undefined) {
    ;[[mode]] = modes
  }
  $: if (mode !== undefined) {
    modeSelectorProps = {
      config: modes,
      mode,
      onChange: onModeChanged
    }
  }
</script>

{#if modeSelectorProps !== undefined}
  <ModeSelector kind={'subtle'} props={modeSelectorProps} />
{/if}
