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

import { generateId } from '@hcengineering/core'
import { type ColorMetaNameOrHex, type CanvasPoint } from './drawingUtils'

export type CommandUid = string & { readonly __brand: 'CommandUid' }

export interface DrawingCmd {
  id: CommandUid
  type: 'line' | 'text'
}

export interface DrawTextCmd extends DrawingCmd {
  text: string
  pos: CanvasPoint
  fontSize: number
  fontFace: string
  color: ColorMetaNameOrHex
}

export interface DrawLineCmd extends DrawingCmd {
  lineWidth: number
  erasing: boolean
  penColor: ColorMetaNameOrHex
  points: CanvasPoint[]
}

export const makeCommandUid = (): CommandUid => {
  return (crypto?.randomUUID?.() ?? generateId()) as CommandUid
}
