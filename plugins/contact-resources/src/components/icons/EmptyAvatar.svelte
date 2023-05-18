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
  import { IconSize } from '@hcengineering/ui'

  export let size: IconSize
  export let fill: string = 'currentColor'
</script>

<svg class="ava-{size}" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12.9999" cy="13.0011" r="12" transform="rotate(-117.049 12.9999 13.0011)" fill="white" />
  <circle
    cx="12.9999"
    cy="13.0011"
    r="11.5"
    transform="rotate(-117.049 12.9999 13.0011)"
    stroke="black"
    stroke-opacity="0.3"
    stroke-dasharray="3 2"
  />
  <g opacity="0.3">
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M16.0919 10.2525C16.0919 11.9657 14.7182 13.3395 13.0038 13.3395C11.2899 13.3395 9.9156 11.9657 9.9156 10.2525C9.9156 8.5392 11.2899 7.16602 13.0038 7.16602C14.7182 7.16602 16.0919 8.5392 16.0919 10.2525ZM13.0036 18.8326C10.4733 18.8326 8.33691 18.4214 8.33691 16.8347C8.33691 15.2474 10.4867 14.8508 13.0036 14.8508C15.5344 14.8508 17.6702 15.262 17.6702 16.8487C17.6702 18.436 15.5204 18.8326 13.0036 18.8326Z"
      fill="black"
    />
  </g>
</svg>

<style lang="scss">
  .ava-inline {
    width: 0.875rem; // 24
    height: 0.875rem;
  }

  .ava-tiny {
    width: 1.13rem; // ~18
    height: 1.13rem;
  }

  .ava-card {
    width: 1.25rem; // 20
    height: 1.25rem;
  }
  .ava-x-small {
    width: 1.5rem; // 24
    height: 1.5rem;
  }
  .ava-smaller {
    width: 1.75rem; // 32
    height: 1.75rem;
  }
  .ava-small {
    width: 2rem; // 32
    height: 2rem;
  }
  .ava-medium {
    width: 2.25rem; // 36
    height: 2.25rem;
  }
  .ava-large {
    width: 4.5rem; // 72
    height: 4.5rem;
  }
  .ava-x-large {
    width: 7.5rem; // 120
    height: 7.5rem;
  }
</style>
