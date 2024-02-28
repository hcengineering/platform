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
  import { Icon } from '@hcengineering/ui'
  import { ToDoPriority } from '@hcengineering/time'
  import time from '../plugin'

  export let value: ToDoPriority

  function getIconProps (value: ToDoPriority): string {
    switch (value) {
      case ToDoPriority.High:
        return '#F96E50'
      case ToDoPriority.Medium:
        return '#FFCD6B'
      case ToDoPriority.Low:
        return '#0084FF'
      case ToDoPriority.NoPriority:
        return '#FFFFFF'
    }
  }
</script>

{#if value !== ToDoPriority.NoPriority}
  <Icon icon={time.icon.FilledFlag} size={'medium'} iconProps={{ fill: getIconProps(value) }} />
{/if}
