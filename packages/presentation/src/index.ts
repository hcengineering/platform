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

import { addStringsLoader } from '@hcengineering/platform'
import { presentationId } from './plugin'
export * from './attributes'
export { default as AssigneeBox } from './components/AssigneeBox.svelte'
export { default as AttributeBarEditor } from './components/AttributeBarEditor.svelte'
export { default as AttributeEditor } from './components/AttributeEditor.svelte'
export { default as AttributesBar } from './components/AttributesBar.svelte'
export { default as Avatar } from './components/Avatar.svelte'
export { default as Card } from './components/Card.svelte'
export { default as CombineAvatars } from './components/CombineAvatars.svelte'
export { default as EditableAvatar } from './components/EditableAvatar.svelte'
export { default as Members } from './components/Members.svelte'
export { default as MessageBox } from './components/MessageBox.svelte'
export { default as MessageViewer } from './components/MessageViewer.svelte'
export { default as ObjectPopup } from './components/ObjectPopup.svelte'
export { default as PDFViewer } from './components/PDFViewer.svelte'
export { default as SpaceCreateCard } from './components/SpaceCreateCard.svelte'
export { default as SpaceMultiBoxList } from './components/SpaceMultiBoxList.svelte'
export { default as SpaceSelect } from './components/SpaceSelect.svelte'
export { default as SpaceSelector } from './components/SpaceSelector.svelte'
export { default as SpacesMultiPopup } from './components/SpacesMultiPopup.svelte'
export { default as UserBox } from './components/UserBox.svelte'
export { default as UserBoxList } from './components/UserBoxList.svelte'
export { default as UserInfo } from './components/UserInfo.svelte'
export { default as EmployeeBox } from './components/EmployeeBox.svelte'
export { default as UsersPopup } from './components/UsersPopup.svelte'
export { default as MembersBox } from './components/MembersBox.svelte'
export { default as IconMembers } from './components/icons/Members.svelte'
export { default as IconMembersOutline } from './components/icons/MembersOutline.svelte'
export { default as ObjectSearchPopup } from './components/ObjectSearchPopup.svelte'
export { default as IndexedDocumentPreview } from './components/IndexedDocumentPreview.svelte'
export { default as DraggableList } from './components/DraggableList.svelte'
export { connect, versionError } from './connect'
export { default } from './plugin'
export * from './types'
export * from './utils'
export * from './drafts'
export { presentationId }

addStringsLoader(presentationId, async (lang: string) => {
  return await import(`../lang/${lang}.json`)
})
