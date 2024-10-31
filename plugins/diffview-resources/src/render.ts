//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { type DiffHunk, type DiffLine, DiffLineType, EmptyLine } from '@hcengineering/diffview'
import { type HighlightOptions, highlightLines } from '@hcengineering/highlight'

export interface RenderOptions {
  syntaxHighlight: {
    language: string
  }
}

export interface DiffLineRenderResult {
  before: DiffLine
  after: DiffLine
}

export interface DiffHunkRenderResult {
  hunk: DiffHunk
  lines: DiffLineRenderResult[]
}

export function renderHunk (hunk: DiffHunk, options: RenderOptions): DiffHunkRenderResult {
  const syntaxHighlight = options.syntaxHighlight

  const highlightOptions: HighlightOptions = { language: syntaxHighlight.language }

  const { before, after } = splitDiffLines(hunk.lines)
  const beforeHighlighted = highlightDiffLines(before, highlightOptions)
  const afterHighlighted = highlightDiffLines(after, highlightOptions)

  const lines: DiffLineRenderResult[] = []
  while (beforeHighlighted.length > 0 || afterHighlighted.length > 0) {
    const beforeLine = beforeHighlighted.shift() ?? EmptyLine
    const afterLine = afterHighlighted.shift() ?? EmptyLine
    lines.push({ before: beforeLine, after: afterLine })
  }

  return { hunk, lines }
}

function splitDiffLines (lines: DiffLine[]): { before: DiffLine[], after: DiffLine[] } {
  const before: DiffLine[] = []
  const after: DiffLine[] = []

  for (const line of lines) {
    if (line.type === DiffLineType.CONTEXT) {
      before.push(line)
      after.push(line)
    } else if (line.type === DiffLineType.DELETE) {
      before.push(line)
      after.push(EmptyLine)
    } else if (line.type === DiffLineType.INSERT) {
      before.push(EmptyLine)
      after.push(line)
    } else {
      before.push(line)
      after.push(line)
    }
  }

  return { before, after }
}

function highlightDiffLines (lines: DiffLine[], options: HighlightOptions): DiffLine[] {
  // Highlight entire diff hunk content, it is more accurate than highlighting line-by-line
  const content = lines.filter((line) => line.type !== DiffLineType.EMPTY).map((line) => line.content)
  const highlighted = highlightLines(content, options)

  // Reconstruct DiffLine items with highlighted content
  return lines.map((line) =>
    line.type === DiffLineType.EMPTY ? { ...line } : { ...line, content: highlighted.shift() ?? '' }
  )
}
