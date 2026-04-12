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

export const TABLE_METADATA_TOKEN = 'huly-table-metadata:'
export const TABLE_METADATA_MARKER = `<!-- ${TABLE_METADATA_TOKEN}`
export const TABLE_METADATA_MIME_TYPE = 'application/x-huly-table-metadata'

export function hasTableMetadataMarker (text: string): boolean {
  if (text == null || text.length === 0) {
    return false
  }
  return text.includes(TABLE_METADATA_MARKER)
}
