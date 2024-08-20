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

/**
 * @public
 */
export enum DiffLineType {
  INSERT = 'insert',
  DELETE = 'delete',
  CONTEXT = 'context',
  EMPTY = 'empty'
}

/**
 * @public
 */
export interface DiffLineDeleted {
  type: DiffLineType.DELETE
  oldNumber: number
  newNumber: undefined
}

/**
 * @public
 */
export interface DiffLineInserted {
  type: DiffLineType.INSERT
  oldNumber: undefined
  newNumber: number
}

/**
 * @public
 */
export interface DiffLineContext {
  type: DiffLineType.CONTEXT
  oldNumber: number
  newNumber: number
}

/**
 * @public
 */
export interface DiffLineEmpty {
  type: DiffLineType.EMPTY
  oldNumber: undefined
  newNumber: undefined
}

/**
 * @public
 */
export interface DiffLineContent {
  prefix: string
  content: string
}

/**
 * @public
 */
export type DiffLine = (DiffLineDeleted | DiffLineInserted | DiffLineContext | DiffLineEmpty) & DiffLineContent

/**
 * @public
 */
export const EmptyLine: DiffLine = {
  type: DiffLineType.EMPTY,
  oldNumber: undefined,
  newNumber: undefined,
  prefix: '',
  content: ''
}

/**
 * @public
 */
export interface DiffHunk {
  header: string
  lines: DiffLine[]
  oldStartLine: number
  newStartLine: number
}

/**
 * @public
 */
export interface DiffFileStats {
  addedLines: number
  deletedLines: number
}

/**
 * @public
 */
export type DiffFileType = 'add' | 'delete' | 'modify' | 'rename' | 'copy'

/**
 * @public
 */
export interface DiffFile {
  fileName: string
  sha: string
  hunks: DiffHunk[]
  diffType: DiffFileType
  language: string
  oldName: string
  newName: string
  isBinary?: boolean
  isTooBig?: boolean
  stats: DiffFileStats
}
