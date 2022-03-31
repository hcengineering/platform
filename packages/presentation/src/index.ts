//
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
//

import { addStringsLoader } from '@anticrm/platform'
import { presentationId } from './plugin'
export * from './attributes'
export { default as AttributeBarEditor } from './components/AttributeBarEditor.svelte'
export { default as AttributeEditor } from './components/AttributeEditor.svelte'
export { default as AttributesBar } from './components/AttributesBar.svelte'
export { default as Avatar } from './components/Avatar.svelte'
export { default as Card } from './components/Card.svelte'
export { default as EditableAvatar } from './components/EditableAvatar.svelte'
export { default as MessageBox } from './components/MessageBox.svelte'
export { default as MessageViewer } from './components/MessageViewer.svelte'
export { default as PDFViewer } from './components/PDFViewer.svelte'
export { default as SpaceCreateCard } from './components/SpaceCreateCard.svelte'
export { default as SpaceSelect } from './components/SpaceSelect.svelte'
export { default as UserBox } from './components/UserBox.svelte'
export { default as UserBoxList } from './components/UserBoxList.svelte'
export { default as UserInfo } from './components/UserInfo.svelte'
export { connect, versionError } from './connect'
export { default } from './plugin'
export * from './types'
export * from './utils'
export { presentationId }

addStringsLoader(presentationId, async (lang: string) => {
  return await import(`../lang/${lang}.json`)
})
