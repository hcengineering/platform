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
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M20,1.2H4C3.6,1.2,3.2,1.6,3.2,2v4c0,0.4,0.3,0.8,0.8,0.8S4.8,6.4,4.8,6V2.8h14.5v18.5H4.8V18 c0-0.4-0.3-0.8-0.8-0.8S3.2,17.6,3.2,18v4c0,0.4,0.3,0.8,0.8,0.8h16c0.4,0,0.8-0.3,0.8-0.8V2C20.8,1.6,20.4,1.2,20,1.2z"
  />
  <path d="M5.8,15c0-0.4-0.3-0.8-0.8-0.8H3c-0.4,0-0.8,0.3-0.8,0.8s0.3,0.8,0.8,0.8h2C5.4,15.8,5.8,15.4,5.8,15z" />
  <path d="M3,12.8h2c0.4,0,0.8-0.3,0.8-0.8S5.4,11.2,5,11.2H3c-0.4,0-0.8,0.3-0.8,0.8S2.6,12.8,3,12.8z" />
  <path d="M3,9.8h2c0.4,0,0.8-0.3,0.8-0.8S5.4,8.2,5,8.2H3C2.6,8.2,2.2,8.6,2.2,9S2.6,9.8,3,9.8z" />
  <path
    d="M14.8,8.5c0-1.5-1.2-2.8-2.8-2.8S9.2,7,9.2,8.5s1.2,2.8,2.8,2.8S14.8,10,14.8,8.5z M10.8,8.5 c0-0.7,0.6-1.2,1.2-1.2s1.2,0.6,1.2,1.2S12.7,9.8,12,9.8S10.8,9.2,10.8,8.5z"
  />
  <path
    d="M7.2,17.5c0,0.4,0.3,0.8,0.8,0.8s0.8-0.3,0.8-0.8c0-1.8,1.5-3.2,3.2-3.2s3.2,1.5,3.2,3.2 c0,0.4,0.3,0.8,0.8,0.8s0.8-0.3,0.8-0.8c0-2.6-2.1-4.8-4.8-4.8C9.4,12.8,7.2,14.9,7.2,17.5z"
  />
</svg>
