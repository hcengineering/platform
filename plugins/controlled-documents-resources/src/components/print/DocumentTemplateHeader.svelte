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
  export let workspace: string
  export let title: string
  export let reference: string

  const rootStyle = /* css */ `
    width: 100%;
    font-family: 'IBM Plex Sans';
    font-size: 7pt;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    margin: 0 9mm;
  `

  const rowStyle = /* css */ `
    display: flex;
    justify-content: space-between;
    line-height: 150%;
    margin-bottom: 2mm;
  `

  const separatorStyle = /* css */ `
    border-bottom: 1px solid #cccccc;
    margin: 1px 0;
  `
</script>

<header style={rootStyle}>
  <div style={rowStyle}>
    <span>{workspace}</span>
    <span>{title}</span>
    <span>{reference}</span>
  </div>
  <div style={separatorStyle} />
</header>
