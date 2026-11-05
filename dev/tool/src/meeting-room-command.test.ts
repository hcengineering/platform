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

import { Command, CommanderError, type OutputConfiguration, type ParseOptions } from 'commander'
import { parseIncludedWorkspaces } from './meeting-room-command'

describe('meeting room command include filter', () => {
  it.each(['', ' ', ', ,'])('rejects an explicitly empty filter %j before running the action', (value) => {
    const action = jest.fn()
    const output: OutputConfiguration = { writeErr: jest.fn() }
    const parseOptions: ParseOptions = { from: 'user' }
    const command = new Command()
      .exitOverride()
      .configureOutput(output)
      .option('--include-workspaces <workspaces>', 'Workspace UUIDs or URLs', parseIncludedWorkspaces)
      .action(action)

    expect(() => command.parse(['--include-workspaces', value], parseOptions)).toThrow(CommanderError)
    expect(action).not.toHaveBeenCalled()
  })

  it('normalizes non-empty workspace lists', () => {
    expect(parseIncludedWorkspaces(' workspace-one, ,workspace-two ')).toEqual(['workspace-one', 'workspace-two'])
  })
})
