<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  export let size: 'x-small' | 'small' | 'medium' | 'large' | 'full'
  export let fill: string = 'currentColor'
</script>

<svg width="32" height="32" viewBox="0 0 32 32" class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg">
  <path
    d="M4 10.0002C4 8.34339 5.34315 7.00024 7 7.00024H19C20.6569 7.00024 22 8.34339 22 10.0002V22.0002C22 23.6571 20.6569 25.0002 19 25.0002H7C5.34315 25.0002 4 23.6571 4 22.0002V10.0002ZM7 5.00024C4.23858 5.00024 2 7.23882 2 10.0002V22.0002C2 24.7617 4.23858 27.0002 7 27.0002H19C21.7614 27.0002 24 24.7617 24 22.0002V20.9991L27.5997 23.7002C28.5885 24.4422 30 23.7366 30 22.5004V9.51017C30 8.27509 28.5908 7.56925 27.6017 8.30888L24 11.0021V10.0002C24 7.23882 21.7614 5.00024 19 5.00024H7ZM24 13.4994L28 10.5084V21.5001L24 18.4987V13.4994Z"
  />
</svg>
