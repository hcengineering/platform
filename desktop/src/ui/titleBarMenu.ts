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

import { ipcMainExposed } from './types'

export function setupTitleBarMenu() {
    const themeManager = new ThemeManager();
    const menuManager = new MenuManager(themeManager);
}

function buildApplicationMenu(): void {
    const menuBuilder = new MenuBuilder();
    
    menuBuilder.addTopLevelMenu('File', 'f')
        .addMenuItem(0, 'New File', 'new-file', 'Ctrl+N', 'n')
        .addMenuItem(0, 'Open File', 'open-file', 'Ctrl+O', 'o')
        .addMenuItem(0, 'Save', 'save-file', 'Ctrl+S', 's')
        .addSeparator(0)
        .addMenuItem(0, 'Exit', 'exit', 'Alt+F4', 'x');
    
    menuBuilder.addTopLevelMenu('Edit', 'e')
        .addMenuItem(1, 'Undo', 'undo', 'Ctrl+Z', 'u')
        .addMenuItem(1, 'Redo', 'redo', 'Ctrl+Y', 'r')
        .addSeparator(1)
        .addMenuItem(1, 'Cut', 'cut', 'Ctrl+X', 't')
        .addMenuItem(1, 'Copy', 'copy', 'Ctrl+C', 'c')
        .addMenuItem(1, 'Paste', 'paste', 'Ctrl+V', 'p');
    
    menuBuilder.addTopLevelMenu('View', 'v')
        .addMenuItem(2, 'Reload', 'reload', 'Ctrl+R', 'r')
        .addMenuItem(2, 'Force Reload', 'force-reload', 'Ctrl+Shift+R', 'o')
        .addMenuItem(2, 'Toggle Developer Tools', 'toggle-devtools', 'F12', 'd')
        .addSeparator(2)
        .addMenuItem(2, 'Toggle Fullscreen', 'toggle-fullscreen', 'F11', 'l')
        .addSeparator(2)
        .addMenuItem(2, 'Toggle Theme', 'toggle-theme', 'Ctrl+T', 't');
    
    menuBuilder.build();
}

class ThemeManager {
    private readonly darkThemeName = 'dark';
    private readonly lightThemeName = 'light';
    private readonly appThemeStorageKey = 'app-theme';
    private readonly domThemeKey = 'data-theme';
    private currentTheme: string;

    constructor() {
        this.currentTheme = this.darkThemeName;
        this.initializeTheme();
    }

    private initializeTheme(): void {
        const savedTheme = localStorage.getItem(this.appThemeStorageKey) || this.darkThemeName;
        this.setTheme(savedTheme);
    }

    public setTheme(theme: string): void {
        this.currentTheme = theme;
        document.body.setAttribute(this.domThemeKey, theme);
        localStorage.setItem(this.appThemeStorageKey, theme);
    }

    public toggleTheme(): void {
        const newTheme = this.currentTheme === this.darkThemeName ? this.lightThemeName : this.darkThemeName;
        this.setTheme(newTheme);
    }
}

interface MenuItem {
    type: 'item' | 'separator';
    label?: string;
    action?: string;
    shortcut?: string;
    acceleratorChar?: string;
    acceleratorPosition?: number;
}

interface TopLevelMenu {
    label: string;
    accelerator: string;
    subMenus: MenuItem[];
}

class MenuBuilder {
    private menus: TopLevelMenu[] = [];

    public addTopLevelMenu(label: string, accelerator: string): this {
        const menu: TopLevelMenu = {
            label,
            accelerator,
            subMenus: []
        };
        this.menus.push(menu);
        return this;
    }

    public addMenuItem(
        topLevelMenuIndex: number, 
        label: string, 
        action: string, 
        shortcut: string, 
        acceleratorChar: string | null = null
    ): this {
        const acceleratorPosition: number = 0;
        if (topLevelMenuIndex >= 0 && topLevelMenuIndex < this.menus.length) {
            const item: MenuItem = {
                type: 'item',
                label,
                action,
                shortcut,
                acceleratorChar: acceleratorChar || label.charAt(acceleratorPosition).toLowerCase(),
                acceleratorPosition
            };
            this.menus[topLevelMenuIndex].subMenus.push(item);
        }
        return this;
    }

    public addSeparator(topLevelMenuIndex: number): this {
        if (topLevelMenuIndex >= 0 && topLevelMenuIndex < this.menus.length) {
            this.menus[topLevelMenuIndex].subMenus.push({ type: 'separator' });
        }
        return this;
    }

    public build(): void {
        const menuContainer = document.querySelector('.desktop-app-menu-container');
        if (!menuContainer) return;

        const existingMenuBar = menuContainer.querySelector('.desktop-app-menu-bar');
        if (existingMenuBar) {
            existingMenuBar.remove();
        }

        const menuBar = document.createElement('ul');
        menuBar.className = 'desktop-app-menu-bar';

        this.menus.forEach((menu) => {
            const menuItem = document.createElement('li');
            menuItem.className = 'desktop-app-menu-item';

            const menuButton = document.createElement('button');
            menuButton.className = 'desktop-app-top-menu-button';
            menuButton.dataset.menu = menu.label.toLowerCase();
            menuButton.dataset.accelerator = menu.accelerator;

            const acceleratorSpan = document.createElement('span');
            acceleratorSpan.className = 'desktop-app-accelerator';
            acceleratorSpan.dataset.menu = menu.label.toLowerCase();

            const labelText = menu.label;
            const acceleratorIndex = labelText.toLowerCase().indexOf(menu.accelerator);
            
            if (acceleratorIndex === 0) {
                acceleratorSpan.textContent = menu.accelerator.toUpperCase();
                menuButton.appendChild(acceleratorSpan);
                menuButton.appendChild(document.createTextNode(labelText.substring(1)));
            } else if (acceleratorIndex > 0) {
                acceleratorSpan.textContent = menu.accelerator.toLowerCase();
                menuButton.appendChild(document.createTextNode(labelText.substring(0, acceleratorIndex)));
                menuButton.appendChild(acceleratorSpan);
                menuButton.appendChild(document.createTextNode(labelText.substring(acceleratorIndex + 1)));
            } else {
                menuButton.textContent = labelText;
            }

            const dropdown = document.createElement('div');
            dropdown.className = 'desktop-app-dropdown-menu';
            dropdown.id = `${menu.label.toLowerCase()}-menu`;

            menu.subMenus.forEach(item => {
                if (item.type === 'separator') {
                    const separator = document.createElement('div');
                    separator.className = 'desktop-app-dropdown-separator';
                    dropdown.appendChild(separator);
                } else if (item.type === 'item' && item.label && item.action) {
                    const menuItemButton = document.createElement('button');
                    menuItemButton.className = 'desktop-app-dropdown-item';
                    menuItemButton.dataset.accelerator = item.acceleratorChar!;
                    menuItemButton.dataset.action = item.action;

                    const labelSpan = document.createElement('span');
                    
                    const itemAcceleratorSpan = document.createElement('span');
                    itemAcceleratorSpan.className = 'desktop-app-accelerator';

                    const labelParts = this.splitLabelByAccelerator(item.label, item.acceleratorChar!);
                    
                    const actualChar = item.label.charAt(
                        item.label.toLowerCase().indexOf(item.acceleratorChar!.toLowerCase())
                    );
                    itemAcceleratorSpan.textContent = actualChar;
                    
                    if (labelParts.before) {
                        labelSpan.appendChild(document.createTextNode(labelParts.before));
                    }
                    labelSpan.appendChild(itemAcceleratorSpan);
                    if (labelParts.after) {
                        labelSpan.appendChild(document.createTextNode(labelParts.after));
                    }

                    menuItemButton.appendChild(labelSpan);

                    if (item.shortcut) {
                        const shortcutSpan = document.createElement('span');
                        shortcutSpan.className = 'desktop-app-shortcut';
                        shortcutSpan.textContent = item.shortcut;
                        menuItemButton.appendChild(shortcutSpan);
                    }

                    dropdown.appendChild(menuItemButton);
                }
            });

            menuItem.appendChild(menuButton);
            menuItem.appendChild(dropdown);
            menuBar.appendChild(menuItem);
        });

        menuContainer.appendChild(menuBar);
    }

    private splitLabelByAccelerator(label: string, acceleratorChar: string): { before: string; after: string } {
        const index = label.toLowerCase().indexOf(acceleratorChar.toLowerCase());
        if (index === -1) {
            return { before: label, after: '' };
        }
        return {
            before: label.substring(0, index),
            after: label.substring(index + 1)
        };
    }
}

class MenuManager {
    private themeManager: ThemeManager;
    private altModeActive: boolean = false;
    private expandedTopMenu: HTMLElement | null = null;
    private selectedTopMenuIndex: number | null = null;
    private selectedItemIndex: number = -1;

    private readonly TopMenuStyle = '.desktop-app-top-menu-button';
    private readonly DropdownMenuStyle = '.desktop-app-dropdown-menu';
    private readonly DropdownItemStyle = '.desktop-app-dropdown-item';
    private readonly DropdownItemsSeparatorStyle = 'desktop-app-dropdown-separator';
    private readonly MenuItemStyle = '.desktop-app-menu-item';

    private readonly StateStyleAltMode = 'desktop-app-alt-mode';
    private readonly StateStyleKeyboardSelected = 'desktop-app-keyboard-selected';
    private readonly StateStyleAltModeActive = 'desktop-app-alt-active';

    constructor(themeManager: ThemeManager) {
        buildApplicationMenu();

        this.themeManager = themeManager;
        this.initializeEventListeners();

        const ipcMain = ipcMainExposed()
        ipcMain.onWindowStateChange((_event, state) => {
            const maximizeButton = document.getElementById('maximize-button');
            if (maximizeButton) {
                if (state === 'maximized') {
                    maximizeButton.textContent = '❐';
                } else {
                    maximizeButton.textContent = '□';
                }
            }
        });
    }

    private initializeEventListeners(): void {
        const minimizeButton = document.getElementById('minimize-button');
        const maximizeButton = document.getElementById('maximize-button');
        const closeButton = document.getElementById('close-button');

        const ipcMain = ipcMainExposed()

        if (minimizeButton) {
            minimizeButton.addEventListener('click', () => {
                ipcMain.minimizeWindow();
            });
        }

        if (maximizeButton) {
            maximizeButton.addEventListener('click', () => {
                ipcMain.maximizeWindow();
            });
        }

        if (closeButton) {
            closeButton.addEventListener('click', () => {
                ipcMain.closeWindow();
            });
        }

        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        document.querySelectorAll<HTMLButtonElement>(this.TopMenuStyle).forEach((button, index) => {
            button.addEventListener('click', (e) => this.handleMenuButtonClick(e, index));
        });

        document.addEventListener('click', (e) => this.handleDocumentClick(e));

        document.querySelectorAll<HTMLButtonElement>(this.DropdownItemStyle + '[data-action]').forEach(item => {
            item.addEventListener('click', async () => {
                if (item.dataset.action) {
                    await this.executeMenuAction(item.dataset.action);
                    this.setAltMode(false);
                    this.closeAllMenus();
                }
            });
        });
    }

    private setAltMode(active: boolean): void {
        this.altModeActive = active;
        
        const body = document.body;
        if (active) {
            body.classList.add(this.StateStyleAltModeActive);
            if (this.selectedTopMenuIndex === null) {
                this.setTopMenuSelection(0);
            }
        } else {
            body.classList.remove(this.StateStyleAltModeActive);
            this.closeAllMenus();
            this.clearMenuSelection();
        }
    }

    private clearMenuSelection(): void {
        const menuButtons = document.querySelectorAll<HTMLButtonElement>(this.TopMenuStyle);
        menuButtons.forEach(button => {
            button.classList.remove(this.StateStyleAltMode);
        });
        this.setTopMenuSelection(null);
        this.selectedItemIndex = -1;
    }

    private closeAllMenus(): void {
        document.querySelectorAll<HTMLElement>(this.DropdownMenuStyle).forEach(menu => {
            menu.style.display = 'none';
        });
        this.expandedTopMenu = null;
    }

    private setTopMenuSelection(newSelectionIndex: number | null): void {
        this.selectedTopMenuIndex = newSelectionIndex;
        const menuButtons = document.querySelectorAll<HTMLButtonElement>(this.TopMenuStyle);
        menuButtons.forEach((button, index) => {
            if (index === this.selectedTopMenuIndex) {
                button.classList.add(this.StateStyleAltMode);
                button.focus();
            } else {
                button.classList.remove(this.StateStyleAltMode);
                button.blur();
            }
        });
    }

    private openMenu(menuIndex: number): void {
        this.closeAllMenus();
        const menuButtons = document.querySelectorAll<HTMLButtonElement>(this.TopMenuStyle);
        const menuButton = menuButtons[menuIndex];
        if (!menuButton || !menuButton.dataset.menu) return;
        
        const menuType = menuButton.dataset.menu;
        const dropdown = document.getElementById(`${menuType}-menu`);
        
        if (dropdown) {
            dropdown.style.display = 'block';
            this.expandedTopMenu = dropdown;
            this.selectedItemIndex = 0;
            this.updateDropdownSelection();
        }
    }

    private updateDropdownSelection(): void {
        if (!this.expandedTopMenu) {
            return;
        }
        
        const candidates = this.expandedTopMenu.querySelectorAll<HTMLElement>(this.DropdownItemStyle);
        candidates.forEach((item, index) => {
            if (index === this.selectedItemIndex) {
                item.classList.add(this.StateStyleKeyboardSelected);
            } else {
                item.classList.remove(this.StateStyleKeyboardSelected);
            }
        });
    }

    private async executeMenuAction(action: string): Promise<void> {
        try {
            if (action === 'toggle-theme') {
                this.themeManager.toggleTheme();
                return;
            }
            
            // !!AHTUNG!! TODO: await electronAPI.executeMenuAction(action);
        } catch (error) {
            console.error('error executing action:', error);
        }
    }

    private moveMenuSelectionHorizontal(increment: number): void {
        if (this.selectedTopMenuIndex !== null) {
            const menuButtons = document.querySelectorAll<HTMLButtonElement>(this.TopMenuStyle);
            this.setTopMenuSelection((menuButtons.length + this.selectedTopMenuIndex + increment) % menuButtons.length);
            if (this.expandedTopMenu) {
                this.selectedItemIndex = 0;
                this.openMenu(this.selectedTopMenuIndex);
            }
        }
    }

    private moveMenuSelectionVertical(increment: number): void {
        if (!this.expandedTopMenu) return;
        
        const items = this.expandedTopMenu.querySelectorAll<HTMLElement>(this.DropdownItemStyle);
        let nextIndex = this.selectedItemIndex;
        // skip dividers
        do {
            nextIndex = (nextIndex + increment + items.length) % items.length;
        } while (items[nextIndex].classList.contains(this.DropdownItemsSeparatorStyle));
        this.selectedItemIndex = nextIndex;
        this.updateDropdownSelection();
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (e.altKey && !this.altModeActive) {
            this.setAltMode(true);
            return;
        }

        switch (e.key) {         
            case 'ArrowLeft':
                this.moveMenuSelectionHorizontal(-1);
                break;
                
            case 'ArrowRight':
                this.moveMenuSelectionHorizontal(+1);
                break;

            case 'ArrowDown':
                if (!this.expandedTopMenu && this.selectedTopMenuIndex !== null && this.selectedTopMenuIndex >= 0) {
                    this.openMenu(this.selectedTopMenuIndex);
                } else if (this.expandedTopMenu) {
                    this.moveMenuSelectionVertical(1);
                }
                break;

            case 'ArrowUp':
                if (this.expandedTopMenu) {
                    this.moveMenuSelectionVertical(-1);
                }
                break;
        }

        if (this.altModeActive) {
            switch (e.key) {
                case 'Escape':
                    this.setAltMode(false);
                    break;
            
                case 'Enter':
                case ' ':
                    if (this.expandedTopMenu && this.selectedItemIndex >= 0) {
                        const items = this.expandedTopMenu.querySelectorAll<HTMLButtonElement>(this.DropdownItemStyle);
                        const selectedItem = items[this.selectedItemIndex];
                        if (selectedItem && selectedItem.dataset.action) {
                            this.executeMenuAction(selectedItem.dataset.action);
                            this.setAltMode(false);
                        }
                    } else if (this.selectedTopMenuIndex !== null && this.selectedTopMenuIndex >= 0) {
                        this.openMenu(this.selectedTopMenuIndex);
                    }
                    break;
                    
                default:
                    const key = e.key.toLowerCase();
                    
                    if (this.expandedTopMenu) {
                        const items = this.expandedTopMenu.querySelectorAll<HTMLButtonElement>(this.DropdownItemStyle + '[data-accelerator]');
                        for (let i = 0; i < items.length; i++) {
                            if (items[i].dataset.accelerator === key) {
                                const action = items[i].dataset.action;
                                if (action) {
                                    this.executeMenuAction(action);
                                    this.setAltMode(false);
                                    return;
                                }
                            }
                        }
                    } 
                    
                    const menuButtons = document.querySelectorAll<HTMLButtonElement>(this.TopMenuStyle + '[data-accelerator]');
                    for (let i = 0; i < menuButtons.length; i++) {
                        if (menuButtons[i].dataset.accelerator === key) {
                            this.setTopMenuSelection(i);
                            this.openMenu(this.selectedTopMenuIndex!);
                            return;
                        }
                    }
                    break;
            }
        }
    }

    private handleKeyUp(e: KeyboardEvent): void {
        if (e.key === 'Alt' && this.altModeActive && !this.expandedTopMenu) {
            this.setAltMode(false);
        }
    }

    private handleMenuButtonClick(e: Event, index: number): void {
        const button = e.target as HTMLButtonElement;
        if (!button.dataset.menu) return;
        
        if (this.altModeActive) {
            this.setTopMenuSelection(index);
            if (this.expandedTopMenu && this.expandedTopMenu.id === `${button.dataset.menu}-menu`) {
                this.setAltMode(false);
            } else {
                this.openMenu(this.selectedTopMenuIndex!);
            }
        } else {
            const menuType = button.dataset.menu;
            const dropdown = document.getElementById(`${menuType}-menu`);
            
            const isCurrentMenuExpanded = dropdown && dropdown.style.display === 'block';

            this.closeAllMenus();
            
            if (!isCurrentMenuExpanded && dropdown) {
                dropdown.style.display = 'block';
                this.expandedTopMenu = dropdown;
                this.setTopMenuSelection(index);
            }
        }
    }

    private handleDocumentClick(e: Event): void {
        const target = e.target as HTMLElement;
        if (!target.closest(this.MenuItemStyle) && this.expandedTopMenu && !this.altModeActive) {
            this.closeAllMenus();
        }
    }
}
