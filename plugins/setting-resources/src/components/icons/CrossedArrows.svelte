<!--
// Copyright © 2024 Hardcore Engineering Inc.
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

<svg class="svg-{size}" {fill} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M26.1696 9.00012L22.5898 12.5899L23.9998 13.9999L29.9998 7.99988L23.9998 1.99988L22.5898 3.40988L26.1698 6.99988L21.7712 7.00012C19.7025 7.00012 17.7797 8.06584 16.6832 9.82013L14 14.1133L11.3168 9.82013C10.2203 8.06584 8.2975 7.00012 6.22876 7.00012H3C2.44772 7.00012 2 7.44784 2 8.00012C2 8.55241 2.44772 9.00012 3 9.00012H6.22876C7.60792 9.00012 8.8898 9.7106 9.62075 10.8801L12.8208 16.0001L9.62075 21.1201C8.8898 22.2896 7.60792 23.0001 6.22876 23.0001H3C2.44772 23.0001 2 23.4478 2 24.0001C2 24.5524 2.44772 25.0001 3 25.0001H6.22876C8.2975 25.0001 10.2203 23.9344 11.3168 22.1801L14 17.8869L16.6832 22.1801C17.7797 23.9344 19.7025 25.0001 21.7712 25.0001H26.1696L22.5898 28.5899L23.9998 29.9999L29.9998 23.9999L23.9998 17.9999L22.5898 19.4099L26.1698 22.9999L21.7712 23.0001C20.3921 23.0001 19.1102 22.2896 18.3792 21.1201L15.1792 16.0001L18.3792 10.8801C19.1102 9.7106 20.3921 9.00012 21.7712 9.00012H26.1696Z"
  />
</svg>
