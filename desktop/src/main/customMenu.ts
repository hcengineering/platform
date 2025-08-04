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

import { app, BrowserWindow } from 'electron'
import { MenuBarAction, CommandLogout, CommandSelectWorkspace, CommandOpenSettings } from '../ui/types'

export function dipatchMenuBarAction(mainWindow: BrowserWindow | undefined, action: MenuBarAction) {
    if (mainWindow == null) {
        return
    }
    
    function performZoom(increment: number): void {
        if  (mainWindow == null) {
        return
        }
        const currentZoom = mainWindow.webContents.getZoomFactor();
        mainWindow.webContents.setZoomFactor(currentZoom + increment);
    }

    const zoomStep = 0.1;
    
    switch (action) {
        case 'settings':
            mainWindow.webContents.send(CommandOpenSettings)
            break;
        case 'select-workspace':
            mainWindow.webContents.send(CommandSelectWorkspace)
            break;
        case 'logout':
            mainWindow.webContents.send(CommandLogout)
            break;
        case 'exit':
            app.quit();
            break;
        case 'undo':
            mainWindow.webContents.undo();
            break;
        case 'redo':
            mainWindow.webContents.redo();
            break;
        case 'cut':
            mainWindow.webContents.cut();
            break;
        case 'copy':
            mainWindow.webContents.copy();
            break;
        case 'paste':
            mainWindow.webContents.paste();
            break;
        case 'delete':
            mainWindow.webContents.delete();
            break;
        case 'select-all':
            mainWindow.webContents.selectAll();
            break;
        case 'reload':
            mainWindow?.reload();
            break;
        case 'force-reload':
            mainWindow.webContents.reloadIgnoringCache();
            break;
        case 'toggle-devtools':
            mainWindow.webContents.toggleDevTools();
            break;
        case 'zoom-in':
            performZoom(+zoomStep);
            break;
        case 'zoom-out':
            performZoom(-zoomStep);
            break;
        case 'restore-size':
            mainWindow.webContents.setZoomFactor(1.0);
            break;
        case 'toggle-fullscreen':
            mainWindow.setFullScreen(!mainWindow.isFullScreen()); 
            break;
        default:
            console.log('unknown menu action:', action);
    }
}