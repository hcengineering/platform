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

import { type Diff2HtmlConfig, parse } from 'diff2html'
import {
  type DiffBlock as D2HDiffBlock,
  type DiffFile as D2HDiffFile,
  type DiffLine as D2HDiffLine
} from 'diff2html/lib/types'
import {
  type Diff,
  type DiffFile,
  type DiffFileType,
  type DiffHunk,
  type DiffLine,
  DiffLineType
} from '@hcengineering/diffview'
import { isDevNullName } from './utils'

const diff2htmlConfig: Diff2HtmlConfig = {
  diffMaxChanges: 10000
}

/**
 * @public
 */
export function parseDiff (diff: Diff): DiffFile[] {
  const files = parse(diff, diff2htmlConfig)
  return files.map(mapFile)
}

function mapFile (file: D2HDiffFile): DiffFile {
  const { language, oldName, newName, addedLines, deletedLines, isBinary, isTooBig } = file

  const fileName = isDevNullName(newName) ? oldName : newName
  const sha = file.checksumAfter ?? ''

  const diffType = mapFileDiffType(file)
  const stats = { addedLines, deletedLines }
  const hunks = isTooBig === true ? [] : file.blocks.map(mapHunk)

  return { hunks, language, oldName, newName, fileName, sha, isBinary, isTooBig, diffType, stats }
}

function mapHunk (block: D2HDiffBlock): DiffHunk {
  const { header, oldStartLine, newStartLine } = block
  const lines = block.lines.map(mapLine)

  return { header, oldStartLine, newStartLine, lines }
}

function mapLine (line: D2HDiffLine): DiffLine {
  const { type, oldNumber, newNumber } = line
  const { prefix, content } = parseContentLine(line.content)

  switch (type) {
    case 'context':
      return { type: DiffLineType.CONTEXT, oldNumber, newNumber, prefix, content }
    case 'insert':
      return { type: DiffLineType.INSERT, oldNumber: undefined, newNumber, prefix, content }
    case 'delete':
      return { type: DiffLineType.DELETE, oldNumber, newNumber: undefined, prefix, content }
    default:
      throw new Error(`Unexpected line type: ${type}`)
  }
}

function mapFileDiffType (file: D2HDiffFile): DiffFileType {
  if (file.isNew === true) {
    return 'add'
  }
  if (file.isDeleted === true) {
    return 'delete'
  }
  if (file.isRename === true) {
    return 'rename'
  }
  if (file.isCopy === true) {
    return 'copy'
  }
  return 'modify'
}

const prefixLength = 1

function parseContentLine (line: string): { prefix: string, content: string } {
  return {
    prefix: line.substring(0, prefixLength),
    content: line.substring(prefixLength)
  }
}
