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
  import YesNo from '../YesNo.svelte'
  import recruit from '../../plugin'

  export let object: any
  export let loading = false
</script>

<YesNo
  disabled={loading}
  focusIndex={100}
  label={recruit.string.Onsite}
  tooltip={recruit.string.WorkLocationPreferences}
  bind:value={object.onsite}
  kind={'regular'}
  size={'large'}
/>
<YesNo
  disabled={loading}
  focusIndex={101}
  label={recruit.string.Remote}
  tooltip={recruit.string.WorkLocationPreferences}
  bind:value={object.remote}
  kind={'regular'}
  size={'large'}
/> 