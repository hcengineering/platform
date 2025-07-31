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

import { app } from 'electron'
import { Command, CommandOpenSettings, CommandOpenInbox, CommandOpenOffice, CommandOpenPlanner } from '../ui/types'
import * as path from 'path'

const JUMP_COMMANDS = {
  INBOX: '--jump-to-inbox',
  SETTINGS: '--jump-to-settings',
  PLANNER: '--jump-to-planner',
  OFFICE: '--jump-to-office'
} as const

type JumpCommand = typeof JUMP_COMMANDS[keyof typeof JUMP_COMMANDS];

export function setupWindowsSpecifics(sendCommand: (cmd: Command, ...args: any[]) => void): void {

    app.setAppUserModelId(app.getName());

    app.on('second-instance', (_event: any, commandLine: any, _workingDirectory: any) => {
        const jumpCommand = commandLine[1] as JumpCommand;
        
        let command: Command | undefined;
        switch (jumpCommand) {
            case JUMP_COMMANDS.INBOX:
                command = CommandOpenInbox;
                break;
            case JUMP_COMMANDS.OFFICE:
                command = CommandOpenOffice;
                break;
            case JUMP_COMMANDS.PLANNER:
                command = CommandOpenPlanner;
                break;
            case JUMP_COMMANDS.SETTINGS:
                command = CommandOpenSettings;
                break;
            default: {
                // compile-time check: if jumpCommand is not a known value, this line errors
                const _exhaustive: never = jumpCommand;
                return; // or handle error
            }
        }
        
        if (command) {
            sendCommand(command);
        }
    })

    function getIconPath(iconName: string): string {
      return path.join(process.resourcesPath, 'icons', iconName);
    }

    app.setUserTasks
    ([
        {
            program: process.execPath,
            arguments: JUMP_COMMANDS.SETTINGS,
            iconPath: getIconPath('SettingsIcon.ico'),
            iconIndex: 0,
            title: 'Settings',
            description: 'Open Settings Screen'
        },
        {
            program: process.execPath,
            arguments: JUMP_COMMANDS.INBOX,
            iconPath: getIconPath('InboxIcon.ico'),
            iconIndex: 0,
            title: 'Inbox',
            description: 'Open Inbox'
        },
        {
            program: process.execPath,
            arguments: JUMP_COMMANDS.PLANNER,
            iconPath: getIconPath('PlannerIcon.ico'),
            iconIndex: 0,
            title: 'Planner',
            description: 'Open Planner'
        },
        {
            program: process.execPath,
            arguments: JUMP_COMMANDS.OFFICE,
            iconPath: getIconPath('OfficeIcon.ico'),
            iconIndex: 0,
            title: 'Office',
            description: 'Open Office'
        }
    ])

}