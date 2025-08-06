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

import { app, JumpListItem, JumpListCategory } from 'electron'
import { Command, CommandOpenSettings, CommandOpenInbox, CommandOpenApplication, JumpListSpares  } from '../ui/types'
import * as path from 'path'

const JUMP_COMMANDS = {
  INBOX: '--jump-to-inbox',
  SETTINGS: '--jump-to-settings',
} as const

type JumpCommand = typeof JUMP_COMMANDS[keyof typeof JUMP_COMMANDS]

const JUMP_TO_APP_COMMAND_PREFIX = '--jump-to-app='

function getIconPath(iconName: string): string {
    return path.join(process.resourcesPath, 'icons', iconName)
}

function addFixedFunctionJumpListItems(spares: JumpListSpares, tasks: JumpListItem[]): void {
    tasks.push({
        type: 'task',
        program: process.execPath,
        args: JUMP_COMMANDS.SETTINGS,
        iconPath: getIconPath('SettingsIcon.ico'),
        title: spares.settingsLabel,
        iconIndex: 0,
    })
    tasks.push({
        type: 'task',
        program: process.execPath,
        args: JUMP_COMMANDS.INBOX,
        iconPath: getIconPath('InboxIcon.ico'),
        title: spares.inboxLabel,
        iconIndex: 0,
    })
}

export function rebuildJumpList(spares: JumpListSpares): void {
    const tasks: JumpListItem[] = [];

    addFixedFunctionJumpListItems(spares, tasks)

    if (spares.applications.length > 0) {
        tasks.push({
            type: 'separator'
        })
    }

    for (const application of spares.applications) {
        const iconFileName = application.id.replaceAll(":", "_") + '.ico'
        const cliArguments = `${JUMP_TO_APP_COMMAND_PREFIX}${application.alias}`
        tasks.push({
            type: 'task',
            program: process.execPath,
            args: cliArguments,
            iconPath: getIconPath(iconFileName),
            title: application.title,
            iconIndex: 0,
        })
    }

    const category: JumpListCategory = {
        type: 'tasks',
        items: tasks,
    }

    app.setJumpList([category])
}

export function setupWindowsSpecific(activateWindow: () => void, sendCommand: (cmd: Command, ...args: any[]) => void): void {

    app.setAppUserModelId(app.getName())

    app.on('second-instance', (_event: any, commandLine: any, _workingDirectory: any) => {
        const commandArgument = commandLine[1] as string
        if (typeof commandArgument === 'string' && commandArgument.startsWith(JUMP_TO_APP_COMMAND_PREFIX)) {
            const applicationId = commandArgument.replace(JUMP_TO_APP_COMMAND_PREFIX, '')
            sendCommand(CommandOpenApplication, [applicationId])
            
        } else {
            const jumpCommandCode = commandArgument as JumpCommand
            let command: Command | undefined
            switch (jumpCommandCode) {
                case JUMP_COMMANDS.INBOX:
                    command = CommandOpenInbox
                    break;
                case JUMP_COMMANDS.SETTINGS:
                    command = CommandOpenSettings
                    break;
                default: {
                    // compile-time check: if jumpCommand is not a known value, this line errors
                    const _exhaustive: never = jumpCommandCode
                    return; // or handle error
                }
            }
            
            if (command) {
                sendCommand(command)
            }
        }

        activateWindow()
    })
    
}