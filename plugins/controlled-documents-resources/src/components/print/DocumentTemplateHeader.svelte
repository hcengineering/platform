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
  import { type Blob, type Ref } from '@hcengineering/core'
  import { createQuery, getPreviewThumbnail } from '@hcengineering/presentation'
  import setting from '@hcengineering/setting'

  export let workspace: string
  export let title: string
  export let reference: string

  const logoSize = 128
  const query = createQuery()

  let iconDataUrl: string | undefined = undefined

  query.query(setting.class.WorkspaceSetting, {}, (res) => {
    const ws = res[0]
    const icon = ws?.icon
    if (icon != null) {
      void fetchIconAsDataUrl(icon)
    }
  })

  async function fetchIconAsDataUrl (iconRef: Ref<Blob>): Promise<void> {
    try {
      const url = getPreviewThumbnail(iconRef, logoSize, logoSize, 1)
      const response = await fetch(url)
      const blob = await response.blob()

      const reader = new FileReader()
      reader.onload = () => {
        iconDataUrl = reader.result as string
      }
      reader.readAsDataURL(blob)
    } catch (error) {
      console.error('Failed to convert image to data URL:', error)
      iconDataUrl = undefined
    }
  }

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
    align-items: center;
    justify-content: space-between;
    line-height: 150%;
    margin-bottom: 2mm;
  `

  const separatorStyle = /* css */ `
    border-bottom: 1px solid #cccccc;
    margin: 1px 0;
  `

  const logoContainerStyle = /* css */ `
    display: flex;
    align-items: center;
  `

  const logoStyle = /* css */ `
    width: 24pt;
    height: 24pt;
    border: none;
    margin-right: 4mm;
  `
</script>

<header style={rootStyle}>
  <div style={rowStyle}>
    <span style={logoContainerStyle}>
      {#if iconDataUrl}
        <img src={iconDataUrl} alt={''} style={logoStyle} />
      {/if}
      {workspace}
    </span>
    <span>{title}</span>
    <span>{reference}</span>
  </div>
  <div style={separatorStyle} />
</header>
