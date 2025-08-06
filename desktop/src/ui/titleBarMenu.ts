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

import { IPCMainExposed, MenuBarAction } from './types'
import { isMenuBarAction } from './typesUtils'
import { TitleBarMenuState } from './titleBarMenuState'

export function setupTitleBarMenu(ipcMain: IPCMainExposed, root: HTMLElement): MenuBar {
    const themeManager = new ThemeManager('light')
    const menuManager = new MenuBarManager(root)

    const menuBar = menuManager.getView();

    const menuContainer = root.querySelector('.desktop-app-menu-container')
    if (menuContainer) {
        const existingMenuBar = menuContainer.querySelector('.desktop-app-menu-bar')
        if (existingMenuBar) {
            existingMenuBar.remove()
        }
        menuContainer.appendChild(menuBar)
    }

    menuManager.attachEventListeners(ipcMain)

    ipcMain.onWindowStateChange((_event, state) => {
        const maximizeButton = root.querySelector('#maximize-button')
        if (maximizeButton) {
            if (state === 'maximized') {
                maximizeButton.textContent = '❐'
            } else {
                maximizeButton.textContent = '□'
            }
        }
    })

    return new MenuBar(themeManager)
}

type TitleBarTheme = 'dark' | 'light';

export class MenuBar {
    constructor(private readonly theme: ThemeManager) {
    }

    public setTheme(theme: TitleBarTheme): void {
        this.theme.setTheme(theme)
    }
}

export function buildHulyApplicationMenu(): HTMLElement {
    const menuBuilder = new MenuBuilder()
    
    const MenuFileIndex = 0
    menuBuilder.addTopLevelMenu('File', 'f')
        .addMenuItem(MenuFileIndex, 'Settings', 'settings', undefined, 's')
        .addMenuItem(MenuFileIndex, 'Select Workspace', 'select-workspace', undefined, 'w')
        .addMenuItem(MenuFileIndex, 'Logout', 'logout', undefined, 'l')
        .addSeparator(MenuFileIndex)
        .addMenuItem(MenuFileIndex, 'Exit', 'exit', 'Alt+F4', 'x')
    
    const MenuEditIndex = 1
    menuBuilder.addTopLevelMenu('Edit', 'e')
        .addMenuItem(MenuEditIndex, 'Undo', 'undo', 'Ctrl+Z', 'u')
        .addMenuItem(MenuEditIndex, 'Redo', 'redo', 'Ctrl+Y', 'r')
        .addSeparator(MenuEditIndex)
        .addMenuItem(MenuEditIndex, 'Cut', 'cut', 'Ctrl+X', 't')
        .addMenuItem(MenuEditIndex, 'Copy', 'copy', 'Ctrl+C', 'c')
        .addMenuItem(MenuEditIndex, 'Paste', 'paste', 'Ctrl+V', 'p')
        .addMenuItem(MenuEditIndex, 'Delete', 'delete', 'Delete', 'd')
        .addSeparator(MenuEditIndex)
        .addMenuItem(MenuEditIndex, 'Select All', 'select-all', 'Ctrl+A', 'a')
    
    const MenuViewIndex = 2
    menuBuilder.addTopLevelMenu('View', 'v')
        .addMenuItem(MenuViewIndex, 'Reload', 'reload', 'Ctrl+R', 'r')
        .addMenuItem(MenuViewIndex, 'Force Reload', 'force-reload', 'Ctrl+Shift+R', 'o')
        .addMenuItem(MenuViewIndex, 'Toggle Developer Tools', 'toggle-devtools', 'Ctrl+Shift+I', 'd')
        .addSeparator(MenuViewIndex)
        .addMenuItem(MenuViewIndex, 'Zoom In', 'zoom-in', 'Ctrl+\'+\'', 'i')
        .addMenuItem(MenuViewIndex, 'Zoom Out', 'zoom-out', 'Ctrl+\'-\'', 'u')
        .addMenuItem(MenuViewIndex, 'Actual Size', 'restore-size', 'Ctrl+0', 'a')
        .addSeparator(MenuViewIndex)
        .addMenuItem(MenuViewIndex, 'Toggle Fullscreen', 'toggle-fullscreen', 'F11', 'l')
    
    return menuBuilder.build()
}

class ThemeManager {
    private readonly domThemeKey = 'data-theme'

    constructor(theme: TitleBarTheme) {
        this.setTheme(theme)
    }

    public setTheme(theme: TitleBarTheme): void {
        document.body.setAttribute(this.domThemeKey, theme)
    }
}

interface MenuItem {
    type: 'item' | 'separator'
    label?: string
    action?: MenuBarAction
    shortcut?: string
    acceleratorChar?: string
}

interface TopLevelMenu {
    label: string
    accelerator: string
    subMenus: MenuItem[]
}

export class MenuBuilder {
    private menus: TopLevelMenu[] = []

    public addTopLevelMenu(label: string, accelerator: string): this {
        const menu: TopLevelMenu = {
            label,
            accelerator: accelerator.toLowerCase(),
            subMenus: []
        }
        this.menus.push(menu)
        return this
    }

    public addMenuItem(
        topLevelMenuIndex: number, 
        label: string, 
        action: MenuBarAction, 
        shortcut?: string, 
        acceleratorChar: string | null = null
    ): this {
        if (topLevelMenuIndex >= 0 && topLevelMenuIndex < this.menus.length) {
            const item: MenuItem = {
                type: 'item',
                label,
                action,
                shortcut,
                acceleratorChar: (acceleratorChar || label.charAt(0)).toLowerCase(),
            }
            this.menus[topLevelMenuIndex].subMenus.push(item)
        }
        return this
    }

    public addSeparator(topLevelMenuIndex: number): this {
        if (topLevelMenuIndex >= 0 && topLevelMenuIndex < this.menus.length) {
            this.menus[topLevelMenuIndex].subMenus.push({ type: 'separator' })
        }
        return this
    }

    public build(): HTMLElement {
        const menuBar = document.createElement('ul')
        menuBar.className = 'desktop-app-menu-bar'

        this.menus.forEach((topLevelMenu) => {
            const topLevelMenuView = document.createElement('li')
            topLevelMenuView.className = 'desktop-app-menu-item'

            const menuButton = document.createElement('button')
            menuButton.className = 'desktop-app-top-menu-button'
            menuButton.dataset.menu = topLevelMenu.label.toLowerCase()
            menuButton.dataset.accelerator = topLevelMenu.accelerator

            const acceleratorSpan = document.createElement('span')
            acceleratorSpan.className = 'desktop-app-accelerator'
            acceleratorSpan.dataset.menu = topLevelMenu.label.toLowerCase()

            const labelText = topLevelMenu.label
            const acceleratorIndex = labelText.toLowerCase().indexOf(topLevelMenu.accelerator)
            
            if (acceleratorIndex === 0) {
                acceleratorSpan.textContent = topLevelMenu.accelerator.toUpperCase()
                menuButton.appendChild(acceleratorSpan)
                menuButton.appendChild(document.createTextNode(labelText.substring(1)))
            } else if (acceleratorIndex > 0) {
                acceleratorSpan.textContent = topLevelMenu.accelerator.toLowerCase()
                menuButton.appendChild(document.createTextNode(labelText.substring(0, acceleratorIndex)))
                menuButton.appendChild(acceleratorSpan)
                menuButton.appendChild(document.createTextNode(labelText.substring(acceleratorIndex + 1)))
            } else {
                menuButton.textContent = labelText
            }

            const dropdown = document.createElement('div')
            dropdown.className = 'desktop-app-dropdown-menu'
            dropdown.id = `${topLevelMenu.label.toLowerCase()}-menu`

            topLevelMenu.subMenus.forEach(item => {
                if (item.type === 'separator') {
                    const separator = document.createElement('div')
                    separator.className = 'desktop-app-dropdown-separator'
                    dropdown.appendChild(separator)
                } else if (item.type === 'item' && item.label != null) {
                    const menuItemButton = document.createElement('button')
                    menuItemButton.className = 'desktop-app-dropdown-item'
                    menuItemButton.dataset.accelerator = item.acceleratorChar
                    menuItemButton.dataset.action = item.action

                    const labelSpan = document.createElement('span')
                    
                    const itemAcceleratorSpan = document.createElement('span')
                    itemAcceleratorSpan.className = 'desktop-app-accelerator'

                    if (item.acceleratorChar) {
                        const labelParts = this.splitLabelByAccelerator(item.label, item.acceleratorChar)
                        
                        const actualChar = item.label.charAt(
                            item.label.toLowerCase().indexOf(item.acceleratorChar.toLowerCase())
                        )
                        itemAcceleratorSpan.textContent = actualChar
                        
                        if (labelParts.before) {
                            labelSpan.appendChild(document.createTextNode(labelParts.before))
                        }
                        labelSpan.appendChild(itemAcceleratorSpan)
                        if (labelParts.after) {
                            labelSpan.appendChild(document.createTextNode(labelParts.after))
                        }
                    }
                    
                    menuItemButton.appendChild(labelSpan)

                    if (item.shortcut) {
                        const shortcutSpan = document.createElement('span')
                        shortcutSpan.className = 'desktop-app-shortcut'
                        shortcutSpan.textContent = item.shortcut
                        menuItemButton.appendChild(shortcutSpan)
                    }

                    dropdown.appendChild(menuItemButton)
                }
            })

            topLevelMenuView.appendChild(menuButton)
            topLevelMenuView.appendChild(dropdown)
            menuBar.appendChild(topLevelMenuView)
        })

        return menuBar
    }

    private splitLabelByAccelerator(label: string, acceleratorChar: string): { before: string; after: string } {
        const index = label.toLowerCase().indexOf(acceleratorChar.toLowerCase())
        if (index === -1) {
            return { before: label, after: '' }
        }
        return {
            before: label.substring(0, index),
            after: label.substring(index + 1)
        }
    }
}

class MenuBarManager {
    private readonly state: TitleBarMenuState
    private readonly view: HTMLElement
    
    private altPressed: boolean = false 
    private controlKeysActivated: boolean = false
    
    private readonly TopMenuStyle = '.desktop-app-top-menu-button'
    private readonly DropdownMenuStyle = '.desktop-app-dropdown-menu'
    private readonly DropdownItemStyle = '.desktop-app-dropdown-item'
    private readonly MenuItemStyle = '.desktop-app-menu-item'

    private readonly StateStyleAltMode = 'desktop-app-alt-mode'
    private readonly StateStyleKeyboardSelected = 'desktop-app-keyboard-selected'
    private readonly StateStyleAltModeActive = 'desktop-app-alt-active'

    constructor(private readonly root: HTMLElement) {
        this.state = new TitleBarMenuState(
            () => this.topLevelMenus().length,
            (topLevelMenuIndex: number) => {
                const children = this.childrenOfTopLevelMenu(topLevelMenuIndex)
                return children.length
            }
        )

        this.view = buildHulyApplicationMenu()
    }

    public getView(): HTMLElement {
        return this.view  
    }

    private topLevelMenus() {
        return this.root.querySelectorAll<HTMLButtonElement>(this.TopMenuStyle)
    }

    private onButtonClick(id: string, callback: () => void): void {
        const button = this.root.querySelector(`#${id}`)
        if (button) {
            button.addEventListener('click', callback)
        }
    }

    public attachEventListeners(ipcMain: IPCMainExposed): void {
        this.onButtonClick('minimize-button', () => {
            ipcMain.minimizeWindow()
        })
        
        this.onButtonClick('maximize-button', () => {
            ipcMain.maximizeWindow()
        })

        this.onButtonClick('close-button', () => {
            ipcMain.closeWindow()
        })

        document.addEventListener('keydown', (e) => this.handleKeyDown(ipcMain, e))
        document.addEventListener('keyup', (e) => this.handleKeyUp(e))

        this.topLevelMenus().forEach((button, index) => {
            button.addEventListener('click', (e) => this.handleTopLevelMenuButtonClick(e, index))
        })

        document.addEventListener('click', (e) => this.handleDocumentClick(e))

        document.querySelectorAll<HTMLButtonElement>(this.DropdownItemStyle + '[data-action]').forEach(item => {
            item.addEventListener('click', async () => this.handleMenuButtonClick(ipcMain, item))
        })

        ipcMain.onWindowFocusLoss(() => {
            this.state.exitAltMode()
            this.altPressed = false
            this.controlKeysActivated = false
            this.renderState()
        })
    }

    private renderState() {
        if (this.state.isAltModeActive) {
            this.root.classList.add(this.StateStyleAltModeActive)
        } else {
            this.root.classList.remove(this.StateStyleAltModeActive)
        }

        this.root.querySelectorAll<HTMLElement>(this.DropdownMenuStyle).forEach(menu => {
            menu.style.display = 'none'
        })

        const topLevelMenus = this.topLevelMenus()
        
        topLevelMenus.forEach((button, index) => {
            button.classList.remove(this.StateStyleAltMode)

            if (index === this.state.FocusedTopLevelMenuIndex) {
                button.classList.add(this.StateStyleAltMode)
                button.focus()

                if (this.state.isTopLevelMenuExpanded && button.dataset.menu) {
                    const menuType = button.dataset.menu
                    const dropdown = this.root.querySelector(`#${menuType}-menu`) as HTMLElement | null
                    if (dropdown) {
                        dropdown.style.display = 'block'
                    }
                }
            } else {
                button.blur()
            }
        })

        if (this.state.FocusedTopLevelMenuIndex != null && this.state.isTopLevelMenuExpanded) {
            const candidates = this.childrenOfTopLevelMenu(this.state.FocusedTopLevelMenuIndex)
            candidates.forEach((menu, index) => {
                if (index === this.state.FocusedChildMenuIndex) {
                    menu.classList.add(this.StateStyleKeyboardSelected)
                } else {
                    menu.classList.remove(this.StateStyleKeyboardSelected)
                }
            })
        }
    }

    private childrenOfTopLevelMenu(index: number): NodeListOf<HTMLElement> {
        const topLevelMenus = this.topLevelMenus()
        const menuButton = topLevelMenus[index]
        const menuType = menuButton.dataset.menu
        const dropdown = this.root.querySelector(`#${menuType}-menu`) as HTMLElement | null
        if (dropdown) {
            return dropdown.querySelectorAll<HTMLElement>(this.DropdownItemStyle)
        }
        return document.createDocumentFragment().querySelectorAll<HTMLElement>('*')
    }

    private async executeMenuAction(ipcMain: IPCMainExposed, action: MenuBarAction): Promise<void> {
        try {
            await ipcMain.executeMenuBarAction(action);
        } catch (error) {
            console.error('error executing action:', error)
        }
    }

    private handleKeyDown(ipcMain: IPCMainExposed, e: KeyboardEvent): void {
        if (e.altKey) {
            this.altPressed = true
        }

        if (e.shiftKey || e.ctrlKey || e.metaKey) {
            if (this.altPressed) {
                this.controlKeysActivated = true
                return
            }
        }
        
        if (e.altKey) {
            if (this.state.isAltModeActive) {
                if (this.state.FocusedTopLevelMenuIndex != null) {
                    this.state.closeAll()
                    this.renderState()
                    return
                }
            } else {
                this.state.enterAltMode(null)
                this.renderState()
            }
        }

        switch (e.key) {         
            case 'ArrowLeft':
                this.state.moveFocusHorizontal(-1)
                this.renderState()
                break
                
            case 'ArrowRight':
                this.state.moveFocusHorizontal(+1)
                this.renderState()
                break

            case 'ArrowDown':
                this.state.moveFocusVertical(+1)
                this.renderState()
                break

            case 'ArrowUp':
                this.state.moveFocusVertical(-1)
                this.renderState()
                break
        }

        switch (e.key) {
            case 'Escape':
                this.state.defocus()
                this.renderState()
                break
        
            case 'Enter':
            case ' ':
                if (this.state.FocusedTopLevelMenuIndex != null){
                    if (this.state.isTopLevelMenuExpanded) {
                        if (this.state.FocusedChildMenuIndex != null) {
                            const children = this.childrenOfTopLevelMenu(this.state.FocusedTopLevelMenuIndex)
                            const focused = children[this.state.FocusedChildMenuIndex]
                            this.state.closeAll()
                            this.renderState()
                            if (focused.dataset.action && isMenuBarAction(focused.dataset.action)) {
                                this.executeMenuAction(ipcMain, focused.dataset.action)
                            }
                            this.renderState()
                        }
                    }
                }
                break
                
            default:
                const key = e.key.toLowerCase()
                if (false == this.state.isAltModeActive) {
                    return
                }

                if (this.state.isTopLevelMenuExpanded && this.state.FocusedTopLevelMenuIndex != null) {
                    const children = this.childrenOfTopLevelMenu(this.state.FocusedTopLevelMenuIndex)
                    for (let i = 0; i < children.length; i++) {
                        if (children[i].dataset.accelerator === key) {
                            const action = children[i].dataset.action
                            if (action) {
                                if (isMenuBarAction(action)) {
                                    this.executeMenuAction(ipcMain, action)
                                }
                                this.state.closeAll()
                                this.renderState()
                                return
                            }
                        }
                    }
                } 
                
                const menuButtons = this.root.querySelectorAll<HTMLButtonElement>(this.TopMenuStyle + '[data-accelerator]')
                for (let i = 0; i < menuButtons.length; i++) {
                    if (menuButtons[i].dataset.accelerator === key) {
                        this.state.expandTopLevelMenu(i)
                        this.state.focusChildMenu()
                        this.renderState()
                        return
                    }
                }
                break
        }
    }

    private handleKeyUp(e: KeyboardEvent): void {
        if (e.key === 'Alt') {
            if (this.controlKeysActivated) {
                this.state.exitAltMode()
                this.renderState()
            } else {
                if (this.state.FocusedTopLevelMenuIndex == null) {
                    this.state.enterAltMode(0)
                    this.renderState()
                }
            }
            this.controlKeysActivated = false
            this.altPressed = false
        }
    }

    private async handleMenuButtonClick(ipcMain: IPCMainExposed, item: HTMLButtonElement): Promise<void> {
        const action = item.dataset.action
        if (action) {
            if (isMenuBarAction(action)) {
                await this.executeMenuAction(ipcMain, action)
            }
            this.state.closeAll()
            this.renderState()
        }
    }

    private handleTopLevelMenuButtonClick(_e: Event, index: number): void {
        this.state.expandTopLevelMenu(index)
        this.renderState()
    }

    private handleDocumentClick(e: Event): void {
        const target = e.target as HTMLElement
        if (!target.closest(this.MenuItemStyle)) {
            this.state.closeAll()
            this.renderState()
        }
    }
}
