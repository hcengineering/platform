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
  import { ButtonSize } from '../../types'

  export let size: ButtonSize
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 14 12" xmlns="http://www.w3.org/2000/svg">
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M7 1C3.60474 1 1 3.31362 1 6C1 7.08097 1.4127 8.08912 2.12929 8.91766C2.24292 9.04906 2.28022 9.23002 2.22779 9.39564C2.05513 9.9411 1.7993 10.4525 1.48219 10.9281C2.18374 10.8248 2.86228 10.6118 3.49342 10.2991C3.63342 10.2297 3.79779 10.2298 3.93773 10.2993C4.83161 10.7431 5.87792 11 7 11C10.3953 11 13 8.68638 13 6C13 3.31362 10.3953 1 7 1ZM7.77784e-07 6C7.77784e-07 2.61125 3.21556 0 7 0C10.7844 0 14 2.61125 14 6C14 9.38875 10.7844 12 7 12C5.81593 12 4.69721 11.7481 3.71539 11.3008C2.71555 11.7572 1.62029 12 0.500001 12C0.315603 12 0.146173 11.8985 0.0591635 11.7359C-0.027846 11.5733 -0.0183098 11.3761 0.0839756 11.2226L0.687434 10.3175C0.890167 10.0134 1.05767 9.68744 1.18687 9.346C0.442008 8.39623 7.77784e-07 7.24553 7.77784e-07 6Z"
  />
</svg>
