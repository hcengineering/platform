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
  export let size: 'small' | 'medium' | 'large'
  // const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <circle fill={'#fff'} cx="8" cy="8" r="8"/>
  <g fill={'#1A237B'}>
    <path d="M10.2,0.3v5.2l4.1-2.4C13.3,1.8,11.9,0.8,10.2,0.3z"/>
    <path d="M1.7,3.1l4.2,2.5V0.3C4.2,0.7,2.8,1.7,1.7,3.1z"/>
    <path d="M15.6,5.6l-0.4,0.2h0.5C15.7,5.8,15.7,5.7,15.6,5.6z"/>
    <path d="M15.5,10.8c0,0,0-0.1,0.1-0.1h-0.3L15.5,10.8z"/>
    <path d="M5.9,15.7V11L2,13.3C3,14.4,4.4,15.3,5.9,15.7z"/>
    <path d="M10.2,15.7c1.5-0.4,2.8-1.3,3.8-2.5L10.2,11V15.7z"/>
    <path d="M0.5,10.9l0.4-0.2H0.5C0.5,10.7,0.5,10.8,0.5,10.9z"/>
    <path d="M0.3,5.8h0.6L0.4,5.5C0.4,5.6,0.3,5.7,0.3,5.8z"/>
  </g>
  <g fill={'#BD0034'}>
    <path d="M15.2,4.4c-0.1-0.3-0.3-0.6-0.5-0.8l-3.9,2.2h1.9L15.2,4.4z"/>
    <path d="M12.3,10.7l2.6,1.4c0.2-0.3,0.3-0.5,0.4-0.8l-1.1-0.6H12.3z"/>
    <path d="M4.2,5.8L1,4C0.9,4.3,0.8,4.6,0.6,4.9l1.7,1H4.2z"/>
    <path d="M1.2,12.2c0.2,0.3,0.3,0.5,0.5,0.8l4-2.3H3.9L1.2,12.2z"/>
    <path d="M15.9,6.9H9.4V0.1C8.9,0,8.5,0,8,0C7.6,0,7.2,0,6.8,0.1v6.8H0.1C0,7.2,0,7.6,0,8c0,0.6,0.1,1.1,0.2,1.6h6.6 v6.3C7.2,16,7.6,16,8,16c0.5,0,0.9,0,1.4-0.1V9.6h6.5C15.9,9.1,16,8.6,16,8C16,7.6,16,7.2,15.9,6.9z"/>
  </g>
</svg>
