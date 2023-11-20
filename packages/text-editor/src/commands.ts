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
import { type Editor } from '@tiptap/core'
import { type TextEditorCommand, type TextEditorCommandHandler } from './types'

export function textEditorCommandHandler (editor: Editor | undefined): TextEditorCommandHandler | undefined {
  return editor !== undefined ? new TextEditorCommandHandlerImpl(editor) : undefined
}

class TextEditorCommandHandlerImpl implements TextEditorCommandHandler {
  constructor (private readonly editor: Editor) {}

  chain (...commands: TextEditorCommand[]): boolean {
    let chain = this.editor.chain()

    for (const command of commands) {
      chain = chain.command(({ editor, commands }) => command({ editor, commands }))
    }

    return chain.run()
  }

  command (command: TextEditorCommand): boolean {
    return this.editor.commands.command(({ editor, commands }) => command({ editor, commands }))
  }
}
