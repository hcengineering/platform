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
-->
<script lang="ts">
  import chunter from '@hcengineering/chunter'
  import { Icon, IconCheckCircle, Label, tooltip } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  export let value: boolean = false

  $: label = value ? chunter.string.Resolved : chunter.string.Unresolved
</script>

<span class="flex-center caption-color" class:resolved={value} use:tooltip={{ label }}>
  <Icon icon={value ? IconCheckCircle : view.icon.Circle} size="small" />
  <span class="status-label"><Label {label} /></span>
</span>

<style lang="scss">
  .resolved {
    color: var(--positive-button-default);
  }

  .status-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
