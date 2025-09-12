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
import { getContext, setContext } from 'svelte'
import type { TextEditorHandler } from '@hcengineering/text-editor'

const EDITOR_HANDLER_CONTEXT = Symbol('editor-handler')

export function setEditorHandler (handler: TextEditorHandler): void {
  try {
    setContext(EDITOR_HANDLER_CONTEXT, handler)
  } catch (err: any) {
    console.warn('Failed to set editor handler context: ', err)
  }
}

export function getEditorHandler (): TextEditorHandler | undefined {
  return getContext(EDITOR_HANDLER_CONTEXT)
}
