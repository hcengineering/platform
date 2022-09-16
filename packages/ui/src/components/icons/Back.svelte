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
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
  export let kind: 'strong' | 'curve' = 'strong'
</script>

{#if kind === 'strong'}
  <svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <polygon points="10.6,14.4 4.3,8 10.6,1.6 11.4,2.4 5.7,8 11.4,13.6 " />
  </svg>
{:else if kind === 'curve'}
  <svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M2.66601 5.33333L2.31246 5.68688L1.95891 5.33333L2.31246 4.97978L2.66601 5.33333ZM5.99935 13.1667C5.72321 13.1667 5.49935 12.9428 5.49935 12.6667C5.49935 12.3905 5.72321 12.1667 5.99935 12.1667L5.99935 13.1667ZM5.6458 9.02022L2.31246 5.68688L3.01957 4.97978L6.3529 8.31311L5.6458 9.02022ZM2.31246 4.97978L5.6458 1.64644L6.3529 2.35355L3.01957 5.68688L2.31246 4.97978ZM2.66601 4.83333L9.66601 4.83333L9.66601 5.83333L2.66602 5.83333L2.66601 4.83333ZM9.66602 13.1667L5.99935 13.1667L5.99935 12.1667L9.66602 12.1667L9.66602 13.1667ZM13.8327 9C13.8327 11.3012 11.9672 13.1667 9.66602 13.1667L9.66602 12.1667C11.4149 12.1667 12.8327 10.7489 12.8327 9L13.8327 9ZM9.66601 4.83333C11.9672 4.83333 13.8327 6.69881 13.8327 9L12.8327 9C12.8327 7.2511 11.4149 5.83333 9.66601 5.83333L9.66601 4.83333Z"
    />
  </svg>
{/if}
