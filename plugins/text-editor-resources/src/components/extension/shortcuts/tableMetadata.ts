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
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { TABLE_METADATA_MARKER } from '@hcengineering/view'

// Re-exported from the plugin package: the copier writes these and this module reads them, and a
// second copy of the literals is exactly how the two drifted apart before.
export {
  TABLE_METADATA_HTML_ATTRIBUTE,
  TABLE_METADATA_MARKER,
  TABLE_METADATA_MIME_TYPE,
  TABLE_METADATA_TOKEN
} from '@hcengineering/view'

export function hasTableMetadataMarker (text: string): boolean {
  if (text == null || text.length === 0) {
    return false
  }
  return text.includes(TABLE_METADATA_MARKER)
}
