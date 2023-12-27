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
  import { IconSize } from '../../types'
  export let size: IconSize
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <path
    d="M14.1464 1.14645C14.3417 0.951184 14.6583 0.951184 14.8535 1.14645C15.0477 1.34063 15.0488 1.6548 14.8567 1.85031L10.707 5.99999H14V6.99999H8.99996V1.99999H9.99996V5.29299L14.1464 1.14645Z"
  />
  <path
    d="M1.99996 8.99999V9.99999H5.29296L1.14645 14.1464C0.951184 14.3417 0.951184 14.6583 1.14645 14.8535C1.34171 15.0488 1.65829 15.0488 1.85355 14.8535L5.99996 10.707V14H6.99996V8.99999H1.99996Z"
  />
</svg>
