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
  export let style: 'normal' | 'circle' = 'normal'
  export let fill: string = 'var(--dark-color)'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  {#if style === 'circle'}
    <path
      d="M12,2c-2,0-3.9,0.6-5.6,1.7C4.8,4.8,3.5,6.3,2.8,8.2C2,10,1.8,12,2.2,14s1.3,3.7,2.7,5.1c1.4,1.4,3.2,2.4,5.1,2.7c1.9,0.4,4,0.2,5.8-0.6c1.8-0.8,3.4-2,4.5-3.7C21.4,15.9,22,14,22,12c0-1.3-0.3-2.6-0.8-3.8C20.7,7,20,5.9,19.1,4.9c-0.9-0.9-2-1.7-3.2-2.2C14.6,2.3,13.3,2,12,2z M12,20c-1.6,0-3.1-0.5-4.4-1.3c-1.3-0.9-2.3-2.1-2.9-3.6S3.8,12,4.2,10.4c0.3-1.6,1.1-3,2.2-4.1s2.5-1.9,4.1-2.2C12,3.8,13.6,4,15.1,4.6c1.5,0.6,2.7,1.6,3.6,2.9C19.5,8.9,20,10.4,20,12c0,2.1-0.8,4.2-2.3,5.7C16.2,19.2,14.1,20,12,20z M16,11H8c-0.3,0-0.5,0.1-0.7,0.3C7.1,11.5,7,11.7,7,12s0.1,0.5,0.3,0.7C7.5,12.9,7.7,13,8,13h8c0.3,0,0.5-0.1,0.7-0.3S17,12.3,17,12s-0.1-0.5-0.3-0.7S16.3,11,16,11z"
    />
  {:else}
    <path
      d="M16,11H8c-0.3,0-0.5,0.1-0.7,0.3S7,11.7,7,12s0.1,0.5,0.3,0.7S7.7,13,8,13h8c0.3,0,0.5-0.1,0.7-0.3S17,12.3,17,12s-0.1-0.5-0.3-0.7S16.3,11,16,11z"
    />
  {/if}
</svg>
