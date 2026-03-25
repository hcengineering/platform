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
 * Escape markdown link text (brackets, pipes, backslashes, newlines)
 */
export function escapeMarkdownLinkText (text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
}

/**
 * Escape markdown link URL (backslashes and closing parentheses)
 */
export function escapeMarkdownLinkUrl (url: string): string {
  return url.replace(/\\/g, '\\\\').replace(/\)/g, '\\)')
}

/**
 * Escape a markdown table cell while preserving `[text](url)` links.
 */
export function escapeTableCell (value: unknown): string {
  const s = value == null ? '' : String(value)

  const sep = s.indexOf('](')
  const looksLikeMarkdownLink = s.startsWith('[') && sep !== -1 && s.endsWith(')')
  if (!looksLikeMarkdownLink) {
    return escapeMarkdownLinkText(s)
  }

  const rawText = s.slice(1, sep)
  const rawUrl = s.slice(sep + 2, -1)

  const escapedText = escapeMarkdownLinkText(rawText)
  // `escapeMarkdownLinkUrl` doesn't escape pipes, but pipes break markdown tables.
  const escapedUrl = escapeMarkdownLinkUrl(rawUrl).replace(/\|/g, '\\|')
  return `[${escapedText}](${escapedUrl})`
}
