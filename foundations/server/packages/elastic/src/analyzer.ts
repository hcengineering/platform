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

/**
 * Custom English analyzer defined in the index settings, used when nothing else is configured.
 */
export const DEFAULT_FULLTEXT_ANALYZER = 'rebuilt_english'

/**
 * Resolve the analyzer used for `fulltextSummary` from the `ELASTIC_ANALYZER` environment variable.
 *
 * Any analyzer known to the Elasticsearch/OpenSearch cluster may be used, e.g. a built-in
 * language analyzer like `russian` or `german`. Changing it requires a reindex.
 */
export function getFulltextAnalyzer (env: Record<string, string | undefined> = process.env): string {
  const value = env.ELASTIC_ANALYZER?.trim() ?? ''
  if (value === '') {
    return DEFAULT_FULLTEXT_ANALYZER
  }
  if (!/^[a-z0-9_-]+$/.test(value)) {
    throw new Error(
      `Invalid ELASTIC_ANALYZER value '${value}': expected an analyzer name like 'russian' or 'german' (lowercase letters, digits, '_' or '-')`
    )
  }
  return value
}
