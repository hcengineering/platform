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

export function unwrapETag (etag: string): string {
  // Remove weak validator prefix 'W/'
  if (etag.startsWith('W/')) {
    etag = etag.substring(2)
  }

  // Remove surrounding quotes
  if (etag.startsWith('"') && etag.endsWith('"')) {
    etag = etag.slice(1, -1)
  }

  return etag
}

export function wrapETag (etag: string, weak: boolean = false): string {
  // Remove any existing wrapping first to ensure clean wrap
  etag = unwrapETag(etag)

  // Add quotes if not present
  const quoted = etag.startsWith('"') ? etag : `"${etag}"`

  // Add weak prefix if requested
  return weak ? `W/${quoted}` : quoted
}
