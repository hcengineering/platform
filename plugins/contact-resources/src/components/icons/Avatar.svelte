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
  import { IconSize } from '@hcengineering/ui'

  export let size: IconSize

  export let fill: string = 'var(--theme-caption-color)'
</script>

<svg class="svg-avatar avaicon-{size}" {fill} viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M10 9.99988C12.0711 9.99988 13.75 8.32095 13.75 6.24988C13.75 4.17881 12.0711 2.49988 10 2.49988C7.92893 2.49988 6.25 4.17881 6.25 6.24988C6.25 8.32095 7.92893 9.99988 10 9.99988ZM10 11.2499C12.7614 11.2499 15 9.0113 15 6.24988C15 3.48845 12.7614 1.24988 10 1.24988C7.23858 1.24988 5 3.48845 5 6.24988C5 9.0113 7.23858 11.2499 10 11.2499Z"
  />
  <path
    d="M8.125 12.4999C5.70875 12.4999 3.75 14.4586 3.75 16.8749V18.1249C3.75 18.4701 4.02982 18.7499 4.375 18.7499C4.72018 18.7499 5 18.4701 5 18.1249V16.8749C5 15.149 6.39911 13.7499 8.125 13.7499H11.875C13.6009 13.7499 15 15.149 15 16.8749V18.1249C15 18.4701 15.2798 18.7499 15.625 18.7499C15.9702 18.7499 16.25 18.4701 16.25 18.1249V16.8749C16.25 14.4586 14.2912 12.4999 11.875 12.4999H8.125Z"
  />
</svg>

<style lang="scss">
  .avaicon-inline {
    width: 0.6125rem;
    height: 0.6125rem;
  }

  .avaicon-tiny {
    width: 0.8125rem;
    height: 0.8125rem;
  }

  .avaicon-x-small {
    width: 1rem;
    height: 1rem;
  }
  .avaicon-smaller {
    width: 1.125rem;
    height: 1.125rem;
  }
  .avaicon-small {
    width: 1.25rem;
    height: 1.25rem;
  }
  .avaicon-medium {
    width: 1.5rem;
    height: 1.5rem;
  }
  .avaicon-large {
    width: 2.5rem;
    height: 2.5rem;
  }
  .avaicon-x-large {
    width: 4rem;
    height: 4rem;
  }
  .avaicon-2x-large {
    width: 6rem;
    height: 6rem;
  }
</style>
