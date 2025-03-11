//
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
//

import uiNext, { uiNextId } from './plugin'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { type SvelteComponent } from 'svelte'

export * from './types'
export { uiNextId }
export default uiNext

export { default as Avatar } from './components/Avatar.svelte'
export { default as Icon } from './components/Icon.svelte'
export { default as Label } from './components/Label.svelte'
export { default as Message } from './components/message/Message.svelte'
export { default as MessageInput } from './components/message/MessageInput.svelte'
export { default as MessagesGroup } from './components/message/MessagesGroup.svelte'
export { default as NavItem } from './components/NavItem.svelte'
export { default as NavigationList } from './components/NavigationList.svelte'
export { default as Section } from './components/Section.svelte'
export { default as Divider } from './components/Divider.svelte'
