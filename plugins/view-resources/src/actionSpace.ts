//
// Copyright © 2026 Hardcore Engineering Inc.
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

import { type Ref, type Space } from '@hcengineering/core'

/**
 * Returns a copy of action props with `props.space` set to the space the user currently works in,
 * so popups opened by actions (e.g. "New issue") can preselect it.
 * The original props, which belong to the model action, are never modified.
 */
export function withCurrentSpace (
  actionProps: Record<string, any> | undefined,
  space: Ref<Space> | undefined
): Record<string, any> {
  return {
    ...actionProps,
    props: { ...(actionProps?.props ?? {}), space }
  }
}
