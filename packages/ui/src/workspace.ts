//
// Copyright © 2026 TraceX SAS.
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

/**
 * Shared helpers for rendering workspace selection UI (login page, in-app
 * workspace switcher). Kept here so both places stay visually consistent
 * without introducing a dependency between the plugins that own them.
 * @public
 */
export function getWorkspaceInitial (name: string | undefined): string {
  const initial = (name ?? '').trim().charAt(0).toUpperCase()
  return initial === '' ? '?' : initial
}

/**
 * @public
 */
export function getWorkspaceLastVisitDays (lastVisit: number | undefined): number | undefined {
  if (lastVisit === undefined || lastVisit === 0) {
    return undefined
  }
  return Math.round((Date.now() - lastVisit) / (1000 * 3600 * 24))
}

/**
 * Number of workspaces above which the workspace selectors show a search box.
 * @public
 */
export const WORKSPACE_SEARCH_THRESHOLD = 10

/**
 * Case-insensitive match of a workspace against a search string, by title or URL.
 * An empty (or whitespace-only) search matches everything.
 * @public
 */
export function matchWorkspaceSearch (ws: { name?: string, url: string }, search: string): boolean {
  const query = search.trim().toLocaleLowerCase()
  if (query === '') return true
  return (ws.name?.toLocaleLowerCase().includes(query) ?? false) || ws.url.toLocaleLowerCase().includes(query)
}
