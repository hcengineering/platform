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

import MarkdownIt from 'markdown-it'
import striptags from 'striptags'
/**
 * Configuration options for markdown to HTML conversion
 */
export interface MarkdownOptions {
  /** Enable GitHub Flavored Markdown extensions */
  gfm?: boolean
  /** Enable line breaks */
  breaks?: boolean
}

/**
 * Convert markdown text to HTML
 *
 * @param markdown The markdown text to convert
 * @param options Optional configuration for the conversion
 * @returns The converted HTML string
 */
export function markdownToHtml (markdown: string, options: MarkdownOptions = {}): string {
  if (markdown === '' || typeof markdown !== 'string') {
    return ''
  }

  try {
    // Create markdown-it instance with options
    const md = new MarkdownIt({
      html: true, // Enable HTML tags in source
      breaks: options.breaks ?? true, // Convert '\n' in paragraphs into <br>
      linkify: options.gfm ?? true, // Autoconvert URL-like text to links (part of GFM)
      typographer: false // Disable some language-neutral replacement + quotes beautification
    })

    return md.render(markdown)
  } catch (error) {
    console.error('Error converting markdown to HTML:', error)
    return escapeHtml(markdown)
  }
}

/**
 * Convert markdown to plain text (strip all HTML tags)
 */
export function markdownToText (markdown: string): string {
  if (markdown === '' || typeof markdown !== 'string') {
    return ''
  }

  try {
    const html = markdownToHtml(markdown)
    // Remove HTML tags using a robust library
    return striptags(html).trim()
  } catch (error) {
    console.error('Error converting markdown to text:', error)
    return markdown
  }
}

/**
 * Escape HTML characters in plain text
 */
function escapeHtml (text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;'
  }

  return text.replace(/[&<>"']/g, (match) => htmlEscapes[match] ?? match)
}
