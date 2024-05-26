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
  export let fill: string = 'currentColor'
  export let size: 'small' | 'medium' | 'large' = 'small'
</script>

<svg class="svg-{size}" {fill} width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M20.6667 13.4944C20.1734 13.8241 19.5933 14 19 14C18.2044 14 17.4413 13.6839 16.8787 13.1213C16.3161 12.5587 16 11.7957 16 11C16 10.4067 16.1759 9.82664 16.5056 9.33329C16.8352 8.83994 17.3038 8.45543 17.8519 8.22836C18.4001 8.0013 19.0033 7.94189 19.5853 8.05765C20.1672 8.1734 20.7018 8.45912 21.1213 8.87868C21.5409 9.29824 21.8266 9.83279 21.9424 10.4147C22.0581 10.9967 21.9987 11.5999 21.7716 12.1481C21.5446 12.6962 21.1601 13.1648 20.6667 13.4944ZM19.5556 10.1685C19.3911 10.0587 19.1978 10 19 10C18.7348 10 18.4804 10.1054 18.2929 10.2929C18.1054 10.4804 18 10.7348 18 11C18 11.1978 18.0586 11.3911 18.1685 11.5556C18.2784 11.72 18.4346 11.8482 18.6173 11.9239C18.8 11.9996 19.0011 12.0194 19.1951 11.9808C19.3891 11.9422 19.5673 11.847 19.7071 11.7071C19.847 11.5673 19.9422 11.3891 19.9808 11.1951C20.0194 11.0011 19.9996 10.8 19.9239 10.6173C19.8482 10.4346 19.72 10.2784 19.5556 10.1685Z"
  />
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M4 8C4 5.79086 5.79086 4 8 4H24C26.2091 4 28 5.79086 28 8V24C28 26.2091 26.2091 28 24 28H8C5.79086 28 4 26.2091 4 24V8ZM8 6C6.89543 6 6 6.89543 6 8V17.1715L9.58569 13.5858C10.3667 12.8047 11.6331 12.8047 12.4141 13.5858L17.9999 19.1716L19.5857 17.5858C20.3667 16.8047 21.6331 16.8047 22.4141 17.5858L26 21.1717V8C26 6.89543 25.1046 6 24 6H8ZM6 24V19.9999L10.9999 15L16.5857 20.5858C17.3667 21.3668 18.6331 21.3668 19.4141 20.5858L20.9999 19L26 24.0001C26 25.1046 25.1045 26 24 26H8C6.89543 26 6 25.1046 6 24Z"
  />
</svg>
