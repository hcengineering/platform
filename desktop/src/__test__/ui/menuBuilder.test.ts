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

import '@testing-library/jest-dom';

import { MenuBuilder } from '../../ui/titleBarMenu';
import { MenuBarAction } from '../../ui/types';

describe('MenuBuilder', () => {
    let systemUnderTest: MenuBuilder;

    beforeEach(() => {
        systemUnderTest = new MenuBuilder();
        document.body.innerHTML = '';
    });

    function verifyTopLevelMenu(menuBar: HTMLElement, topLevelMenu: number, expectedMenuName: string, expectedAccelerator: string) {
        const menuButton = menuBar.children[topLevelMenu].children[0] as HTMLElement;
        expect(menuButton.dataset.menu).toBe(expectedMenuName);
        expect(menuButton.dataset.accelerator).toBe(expectedAccelerator);
    }

    describe('addTopLevelMenu', () => {
        test('add a top-level menu', () => {
            systemUnderTest.addTopLevelMenu('File', 'f');

            const builtMenu = systemUnderTest.build();
            
            expect(builtMenu.children).toHaveLength(1);
            verifyTopLevelMenu(builtMenu, 0, 'file', 'f');
        });

        test('method chaining', () => {
            const result = systemUnderTest
                .addTopLevelMenu('File', 'f')
                .addTopLevelMenu('Edit', 'e');

            expect(result).toBe(systemUnderTest);
        });

        test('add multiple top-level menus', () => {
            systemUnderTest
                .addTopLevelMenu('File', 'f')
                .addTopLevelMenu('Edit', 'e')
                .addTopLevelMenu('View', 'v');

            const builtMenu = systemUnderTest.build();
            
            expect(builtMenu.children).toHaveLength(3);
            verifyTopLevelMenu(builtMenu, 0, 'file', 'f');
            verifyTopLevelMenu(builtMenu, 1, 'edit', 'e');
            verifyTopLevelMenu(builtMenu, 2, 'view', 'v');
        });
    });

    describe('addMenuItem', () => {
        beforeEach(() => {
            systemUnderTest.addTopLevelMenu('File', 'f');
        });

        test('add a menu item to existing top-level menu', () => {
            systemUnderTest.addMenuItem(0, 'New', 'redo', 'Ctrl+N');

            const builtMenu = systemUnderTest.build();

            const dropdown = builtMenu.children[0].children[1];
            expect(dropdown.children).toHaveLength(1);

            const menuItem = dropdown.children[0] as HTMLElement;
            expect(menuItem.dataset.action).toBe('redo');
        });

        test('add menu item with custom accelerator character', () => {
            systemUnderTest.addMenuItem(0, 'Save As', 'select-all', 'Ctrl+Shift+S', 'a');

            const builtMenu = systemUnderTest.build();

            const dropdown = builtMenu.children[0].children[1];
            const menuItem = dropdown.children[0] as HTMLElement;
            expect(menuItem.dataset.accelerator).toBe('a');
        });

        test('default accelerator', () => {
            systemUnderTest.addMenuItem(0, 'Open', 'undo', 'Ctrl+O');

            const builtMenu = systemUnderTest.build();
            
            const dropdown = builtMenu.children[0].children[1];
            const menuItem = dropdown.children[0] as HTMLElement;
            expect(menuItem.dataset.accelerator).toBe('o');
        });

        test.each([[999], [-1],])("invalid top-level menu index", (input: number) => {
            systemUnderTest.addMenuItem(input, 'Invalid', 'invalid' as MenuBarAction, 'Ctrl+I');

            const builtMenu = systemUnderTest.build();
            
            const dropdown = builtMenu.children[0].children[1];
            expect(dropdown.children).toHaveLength(0);
        });

        test('add multiple menu items to the same top-level menu', () => {
            systemUnderTest
                .addMenuItem(0, 'New', 'paste', 'Ctrl+N')
                .addMenuItem(0, 'Open', 'cut', 'Ctrl+O')
                .addMenuItem(0, 'Save', 'copy', 'Ctrl+S');

            const builtMenu = systemUnderTest.build();
            
            const dropdown = builtMenu.children[0].children[1];
            expect(dropdown.children).toHaveLength(3);
        });
    });

    describe('addSeparator', () => {
        beforeEach(() => {
            systemUnderTest.addTopLevelMenu('File', 'f');
        });

        test('add a separator', () => {
            systemUnderTest.addSeparator(0);

            const builtMenu = systemUnderTest.build();
            
            const dropdown = builtMenu.children[0].children[1];
            expect(dropdown.children).toHaveLength(1);
            expect(dropdown.children[0]).toHaveClass('desktop-app-dropdown-separator');
        });

        test.each([[999], [-1],])("invalid top-level menu index", (input: number) => {
            systemUnderTest.addSeparator(999);

            const builtMenu = systemUnderTest.build();
            
            const dropdown = builtMenu.children[0].children[1];
            expect(dropdown.children).toHaveLength(0);
        });
    });

    describe('build', () => {
        test('build empty menu bar', () => {
            const builtMenu = systemUnderTest.build();

            expect(builtMenu).toHaveClass('desktop-app-menu-bar');
            expect(builtMenu.children).toHaveLength(0);
        });

        test('menu bar with complex structure of a single top-level menu', () => {
            const topLevelMenu = 0;
            systemUnderTest
                .addTopLevelMenu('File', 'f')
                .addMenuItem(topLevelMenu, 'New', 'paste', 'Ctrl+N')
                .addSeparator(topLevelMenu)
                .addMenuItem(topLevelMenu, 'Exit', 'exit', 'Alt+F4');

            const builtMenu = systemUnderTest.build();

            expect(builtMenu).toHaveClass('desktop-app-menu-bar');
            expect(builtMenu.children).toHaveLength(1);

            const topLevelMenuItem = builtMenu.children[0];
            expect(topLevelMenuItem).toHaveClass('desktop-app-menu-item');
            expect(topLevelMenuItem.children).toHaveLength(2);

            const topButton = topLevelMenuItem.children[0];
            expect(topButton).toHaveClass('desktop-app-top-menu-button');

            const dropdown = topLevelMenuItem.children[1];
            expect(dropdown).toHaveClass('desktop-app-dropdown-menu');
            expect(dropdown.id).toBe('file-menu');
            expect(dropdown.children).toHaveLength(3); // New, separator, Exit
        });

        test('accelerator at the beginning of label', () => {
            systemUnderTest.addTopLevelMenu('File', 'f');

            const builtMenu = systemUnderTest.build();
            
            const topButton = builtMenu.children[0].children[0];
            expect(topButton.textContent).toBe('File');

            const acceleratorSpan = topButton.querySelector('.desktop-app-accelerator');
            expect(acceleratorSpan).toBeTruthy();
            expect(acceleratorSpan?.textContent).toBe('F');
        });

        test('accelerator in the middle of label', () => {
            systemUnderTest.addTopLevelMenu('Edit', 'i'); // 'i' is in the middle of 'Edit'

            const builtMenu = systemUnderTest.build();
            
            const topButton = builtMenu.children[0].children[0];
            expect(topButton.textContent).toBe('Edit');
            
            const acceleratorSpan = topButton.querySelector('.desktop-app-accelerator');
            expect(acceleratorSpan).toBeTruthy();
            expect(acceleratorSpan?.textContent).toBe('i');
        });

        test('accelerator not found in label', () => {
            systemUnderTest.addTopLevelMenu('File', 'z'); // 'z' is not in 'File'

            const builtMenu = systemUnderTest.build();

            const topButton = builtMenu.children[0].children[0];
            expect(topButton.textContent).toBe('File');
            expect(topButton.querySelector('.desktop-app-accelerator')).toBeNull();
        });

        test('dropdown items with shortcuts', () => {
            systemUnderTest
                .addTopLevelMenu('File', 'f')
                .addMenuItem(0, 'New', 'paste', 'Ctrl+N');

            const builtMenu = systemUnderTest.build();

            const dropdownItem = builtMenu.children[0].children[1].children[0] as HTMLElement;
            expect(dropdownItem).toHaveClass('desktop-app-dropdown-item');
            expect(dropdownItem.dataset.action).toBe('paste');

            const shortcutSpan = dropdownItem.querySelector('.desktop-app-shortcut');
            expect(shortcutSpan).toBeTruthy();
            expect(shortcutSpan?.textContent).toBe('Ctrl+N');
        });

        test('without shortcuts when empty', () => {
            systemUnderTest
                .addTopLevelMenu('File', 'f')
                .addMenuItem(0, 'New', 'paste', '');

            const builtMenu = systemUnderTest.build();

            const dropdownItem = builtMenu.children[0].children[1].children[0];
            const shortcutSpan = dropdownItem.querySelector('.desktop-app-shortcut');
            expect(shortcutSpan).toBeNull();
        });

        test('accelerator characters in dropdown items', () => {
            systemUnderTest
                .addTopLevelMenu('File', 'f')
                .addMenuItem(0, 'New', 'paste', 'Ctrl+N')
                .addMenuItem(0, 'Open', 'cut', 'Ctrl+O', 'p');

            const builtMenu = systemUnderTest.build();

            const dropdown = builtMenu.children[0].children[1];
            const newItem = dropdown.children[0] as HTMLElement;
            const openItem = dropdown.children[1] as HTMLElement;

            expect(newItem.dataset.accelerator).toBe('n');
            expect(openItem.dataset.accelerator).toBe('p');

            const newAccelerator = newItem.querySelector('.desktop-app-accelerator');
            const openAccelerator = openItem.querySelector('.desktop-app-accelerator');

            expect(newAccelerator?.textContent).toBe('N');
            expect(openAccelerator?.textContent).toBe('p');
        });

        test('complex menu structure', () => {
            systemUnderTest
                .addTopLevelMenu('File', 'f')
                .addMenuItem(0, 'New', 'paste', 'Ctrl+N')
                .addMenuItem(0, 'Open', 'cut', 'Ctrl+O')
                .addSeparator(0)
                .addMenuItem(0, 'Save', 'cut', 'Ctrl+S')
                .addMenuItem(0, 'Save As', 'cut', 'Ctrl+Shift+S')
                .addSeparator(0)
                .addMenuItem(0, 'Exit', 'cut', 'Alt+F4')
                .addTopLevelMenu('Edit', 'e')
                .addMenuItem(1, 'Undo', 'cut', 'Ctrl+Z')
                .addMenuItem(1, 'Redo', 'cut', 'Ctrl+Y');

            const builtMenu = systemUnderTest.build();

            // Should have 2 top-level menus
            expect(builtMenu.children).toHaveLength(2);

            // File menu should have 7 items (5 menu items + 2 separators)
            const fileDropdown = builtMenu.children[0].children[1];
            expect(fileDropdown.children).toHaveLength(7);

            // Edit menu should have 2 items
            const editDropdown = builtMenu.children[1].children[1];
            expect(editDropdown.children).toHaveLength(2);
        });
    });

    describe('edge cases', () => {
        test('empty labels', () => {
            systemUnderTest
                .addTopLevelMenu('', 'f')
                .addMenuItem(0, '', 'cut', 'shortcut');

            const builtMenu = systemUnderTest.build();
            
            expect(builtMenu.children).toHaveLength(1);

            const dropdown = builtMenu.children[0].children[1];
            expect(dropdown).toHaveClass('desktop-app-dropdown-menu');
            
            expect(dropdown.children).toHaveLength(1);
        });

        test('special characters in labels', () => {
            systemUnderTest
                .addTopLevelMenu('File & Edit', 'f')
                .addMenuItem(0, 'Save & Exit', 'cut', 'Ctrl+S');

            const builtMenu = systemUnderTest.build();

            expect(builtMenu.children).toHaveLength(1);

            const topButton = builtMenu.children[0].children[0];
            expect(topButton.textContent).toBe('File & Edit');
        });

        test('case-insensitive accelerator matching', () => {
            systemUnderTest
                .addTopLevelMenu('File', 'F') // uppercase F
                .addMenuItem(0, 'New', 'paste', 'Ctrl+N', 'N'); // uppercase N

            const builtMenu = systemUnderTest.build();
            
            const dropdownItem = builtMenu.children[0].children[1].children[0] as HTMLElement;
            expect(dropdownItem.dataset.accelerator).toBe('n');

            const topButton = builtMenu.children[0].children[0] as HTMLElement;            
            expect(topButton.dataset.accelerator).toBe('f');

            // Check that the actual character from the label is preserved
            const topAccelerator = topButton.querySelector('.desktop-app-accelerator');
            const itemAccelerator = dropdownItem.querySelector('.desktop-app-accelerator');

            expect(topAccelerator?.textContent).toBe('F');
            expect(itemAccelerator?.textContent).toBe('N');
        });

        test('unicode characters', () => {
            systemUnderTest
                .addTopLevelMenu('Файл', 'ф')
                .addMenuItem(0, 'Новый', 'undo', 'Ctrl+N');

            const builtMenu = systemUnderTest.build();
            
            const topButton = builtMenu.children[0].children[0];
            expect(topButton.textContent).toBe('Файл');

            const acceleratorSpan = topButton.querySelector('.desktop-app-accelerator');
            expect(acceleratorSpan?.textContent).toBe('Ф');
        });
    });
});