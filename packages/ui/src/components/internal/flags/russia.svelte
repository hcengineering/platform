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
  <path fill={'#F4F4F4'} d="M0.5,5.3h15.1C14.4,2.2,11.5,0,8,0S1.6,2.2,0.5,5.3z"/>
  <path fill={'#323E95'} d="M0.5,5.3C0.2,6.2,0,7.1,0,8s0.2,1.8,0.5,2.7h15.1C15.8,9.8,16,8.9,16,8s-0.2-1.8-0.5-2.7H0.5z"/>
  <path fill={'#D8001E'} d="M15.5,10.7H0.5C1.6,13.8,4.5,16,8,16S14.4,13.8,15.5,10.7z"/>
</svg>
