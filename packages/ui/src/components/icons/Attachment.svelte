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
  export let fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M26.682 5.31802C24.9246 3.56066 22.0754 3.56066 20.318 5.31802L5.31802 20.318C3.56066 22.0754 3.56066 24.9246 5.31802 26.682C7.07538 28.4393 9.92462 28.4393 11.682 26.682L11.6875 26.6765L14.1575 24.282C14.5541 23.8976 15.1871 23.9074 15.5716 24.304C15.956 24.7005 15.9461 25.3336 15.5496 25.718L13.0905 28.1019C10.5516 30.6346 6.44031 30.6327 3.90381 28.0962C1.3654 25.5578 1.3654 21.4422 3.90381 18.9038L18.9038 3.90381C21.4422 1.3654 25.5578 1.3654 28.0962 3.90381C30.6346 6.44221 30.6346 10.5578 28.0962 13.0962L20.5104 20.682C18.753 22.4393 15.9038 22.4393 14.1464 20.682C12.3891 18.9246 12.3891 16.0754 14.1464 14.318L17.7929 10.6716C18.1834 10.281 18.8166 10.281 19.2071 10.6716C19.5976 11.0621 19.5976 11.6953 19.2071 12.0858L15.5607 15.7322C14.5843 16.7085 14.5843 18.2915 15.5607 19.2678C16.537 20.2441 18.1199 20.2441 19.0962 19.2678L26.682 11.682C28.4393 9.92462 28.4393 7.07538 26.682 5.31802Z"
  />
</svg>
