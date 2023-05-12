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
  import { IconSize } from '@hcengineering/ui'

  export let size: IconSize
  export let fill: string = 'var(--theme-caption-color)'
</script>

<svg class="svg-newavatar ava-{size}" viewBox="0 0 26 24" xmlns="http://www.w3.org/2000/svg">
  <circle
    fill="transparent"
    stroke="var(--theme-trans-color)"
    stroke-width="1"
    stroke-dasharray="10%"
    cx="12"
    cy="12"
    r="12"
  />
  <path
    fill="var(--theme-trans-color)"
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M15.1,9.3c0,1.7-1.4,3.1-3.1,3.1c-1.7,0-3.1-1.4-3.1-3.1c0-1.7,1.4-3.1,3.1-3.1C13.7,6.2,15.1,7.5,15.1,9.3z M12,17.8c-2.5,0-4.7-0.4-4.7-2c0-1.6,2.2-2,4.7-2c2.5,0,4.7,0.4,4.7,2C16.7,17.4,14.5,17.8,12,17.8z"
  />
  <circle fill="var(--theme-navpanel-color)" cx="20" cy="18" r="5.5" />
  <path
    fill="var(--theme-trans-color)"
    d="M20,13c2.8,0,5,2.2,5,5s-2.2,5-5,5s-5-2.2-5-5S17.2,13,20,13 M20,12c-3.3,0-6,2.7-6,6s2.7,6,6,6s6-2.7,6-6S23.3,12,20,12L20,12z"
  />
  <path
    fill="var(--theme-trans-color)"
    d="M22.8,17.5h-2.2v-2.2c0-0.3-0.2-0.5-0.5-0.5s-0.5,0.2-0.5,0.5v2.2h-2.3c-0.3,0-0.5,0.2-0.5,0.5s0.2,0.5,0.5,0.5h2.3v2.2c0,0.3,0.2,0.5,0.5,0.5s0.5-0.2,0.5-0.5v-2.2h2.2c0.3,0,0.5-0.2,0.5-0.5S23,17.5,22.8,17.5z"
  />
</svg>

<style lang="scss">
  .svg-newavatar {
    overflow: visible;
    margin-right: -8%;
  }
  .ava-inline {
    height: 0.875rem;
  }
  .ava-tiny {
    height: 1.13rem;
  }
  .ava-card {
    height: 1.25rem;
  }
  .ava-x-small {
    height: 1.5rem;
  }
  .ava-smaller {
    height: 1.75rem;
  }
  .ava-small {
    height: 2rem;
  }
  .ava-medium {
    height: 2.25rem;
  }
  .ava-large {
    height: 4.5rem;
  }
  .ava-x-large {
    height: 7.5rem;
  }
</style>
