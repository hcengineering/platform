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

import { TitleBarMenuState } from '../../ui/titleBarMenuState'

describe('TitleBarMenuState', () => {
    let systemUnderTest: TitleBarMenuState
    let mockTopLevelMenuCount: jest.Mock
    let mockMenuItemsCount: jest.Mock

    const TopLevelMenuCount = 3
    const MenuItemCount = 5

    beforeEach(() => {
        mockTopLevelMenuCount = jest.fn().mockReturnValue(TopLevelMenuCount)
        mockMenuItemsCount = jest.fn().mockReturnValue(MenuItemCount)
        systemUnderTest = new TitleBarMenuState(mockTopLevelMenuCount, mockMenuItemsCount)
    })

    describe('construction', () => {
        test('initializes with default values', () => {
            expect(systemUnderTest.isAltModeActive).toBe(false)
            expect(systemUnderTest.isTopLevelMenuExpanded).toBe(false)
            expect(systemUnderTest.FocusedTopLevelMenuIndex).toBeNull()
            expect(systemUnderTest.FocusedChildMenuIndex).toBeNull()
        })
    })

    describe('focusChildMenu', () => {
        test.each([[0],[1]])('when top level menu %i is expanded', (topLevelMenu: number) => {
            systemUnderTest.expandTopLevelMenu(topLevelMenu)
            systemUnderTest.focusChildMenu()
            
            expect(systemUnderTest.FocusedChildMenuIndex).toBe(0)
        })

        test('when alt mode and top level menu is not expanded', () => {
            systemUnderTest.enterAltMode(1)
            systemUnderTest.focusChildMenu()
            
            expect(systemUnderTest.FocusedChildMenuIndex).toBeNull()
        })

        test('when no top level menu is focused', () => {
            systemUnderTest.focusChildMenu()
            
            expect(systemUnderTest.FocusedChildMenuIndex).toBeNull()

            expect(systemUnderTest.isTopLevelMenuExpanded).toBe(false)
            expect(systemUnderTest.FocusedTopLevelMenuIndex).toBeNull()
            expect(systemUnderTest.isAltModeActive).toBe(false)
        })
    })

    describe('expandTopLevelMenu', () => {
        test('normal expansion', () => {
            const targetMenuIndex = 1
            systemUnderTest.expandTopLevelMenu(targetMenuIndex)
            
            expect(systemUnderTest.FocusedTopLevelMenuIndex).toBe(targetMenuIndex)
            expect(systemUnderTest.isTopLevelMenuExpanded).toBe(true)
            expect(systemUnderTest.FocusedChildMenuIndex).toBeNull()

            expect(systemUnderTest.isAltModeActive).toBe(false)
        })

        test.each([[-1],[TopLevelMenuCount],[TopLevelMenuCount+1]])('invalid index %i', (invalidIndex: number) => {
            systemUnderTest.expandTopLevelMenu(invalidIndex)
            
            expect(systemUnderTest.FocusedTopLevelMenuIndex).toBeNull()
            expect(systemUnderTest.isTopLevelMenuExpanded).toBe(false)
            expect(systemUnderTest.FocusedChildMenuIndex).toBeNull()
        })
    })

    describe('enterAltMode', () => {
        test('normal enter', () => {
            systemUnderTest.enterAltMode(2)
            
            expect(systemUnderTest.isAltModeActive).toBe(true)
            expect(systemUnderTest.FocusedTopLevelMenuIndex).toBe(2)
        })

        test.each([[-1],[TopLevelMenuCount],[TopLevelMenuCount+1]])('invalid index %i', (invalidIndex: number) => {
            systemUnderTest.enterAltMode(invalidIndex)
            
            expect(systemUnderTest.isAltModeActive).toBe(true)
            expect(systemUnderTest.FocusedTopLevelMenuIndex).toBeNull()
        })
    })

    describe('closeAll', () => {
        test('resets all state to initial values', () => {
            systemUnderTest.enterAltMode(1)
            systemUnderTest.expandTopLevelMenu(1)
            systemUnderTest.focusChildMenu()
            
            systemUnderTest.closeAll()
            
            expect(systemUnderTest.isAltModeActive).toBe(false)
            expect(systemUnderTest.isTopLevelMenuExpanded).toBe(false)
            expect(systemUnderTest.FocusedTopLevelMenuIndex).toBeNull()
            expect(systemUnderTest.FocusedChildMenuIndex).toBeNull()
        })
    })

    describe('defocus', () => {
        test('when top level menu  expanded', () => {
            systemUnderTest.expandTopLevelMenu(1)
            systemUnderTest.focusChildMenu()
            
            systemUnderTest.defocus()
            
            expect(systemUnderTest.isTopLevelMenuExpanded).toBe(false)
            expect(systemUnderTest.FocusedChildMenuIndex).toBeNull()
            expect(systemUnderTest.FocusedTopLevelMenuIndex).toBe(1)
            
            expect(systemUnderTest.isAltModeActive).toBe(false)
        })

        test('when top level menu is not expanded', () => {
            systemUnderTest.enterAltMode(1)
            
            systemUnderTest.defocus()
            
            expect(systemUnderTest.isAltModeActive).toBe(false)
            expect(systemUnderTest.isTopLevelMenuExpanded).toBe(false)
            expect(systemUnderTest.FocusedTopLevelMenuIndex).toBeNull()
            expect(systemUnderTest.FocusedChildMenuIndex).toBeNull()

            expect(systemUnderTest.isAltModeActive).toBe(false)
        })
    })

    describe('moveFocusHorizontal', () => {
        const DefaultTopLevelFocus = 1
        beforeEach(() => {
            systemUnderTest.enterAltMode(DefaultTopLevelFocus)
        })

        test.each([
            [+1, DefaultTopLevelFocus + 1],
            [-1, DefaultTopLevelFocus - 1],
        ])('with increment %i, and top menu collapsed', (incremet: number, expectedTopLevelFocus: number) => {
            const focusedChildBefore = systemUnderTest.FocusedChildMenuIndex
            systemUnderTest.moveFocusHorizontal(incremet)
            
            expect(systemUnderTest.FocusedTopLevelMenuIndex).toBe(expectedTopLevelFocus)
            expect(systemUnderTest.FocusedChildMenuIndex).toBe(focusedChildBefore)

            expect(systemUnderTest.isAltModeActive).toBe(true)
        })

        test.each([
            [+1, DefaultTopLevelFocus + 1],
            [-1, DefaultTopLevelFocus - 1],
        ])('with increment %i, and top menu expanded', (incremet: number, expectedTopLevelFocus: number) => {
            systemUnderTest.expandTopLevelMenu(DefaultTopLevelFocus)
            systemUnderTest.focusChildMenu()
            systemUnderTest.moveFocusVertical(1)

            systemUnderTest.moveFocusHorizontal(incremet)
            
            expect(systemUnderTest.FocusedTopLevelMenuIndex).toBe(expectedTopLevelFocus)
            expect(systemUnderTest.FocusedChildMenuIndex).toBe(0)

            expect(systemUnderTest.isAltModeActive).toBe(true)
        })

        test('positive wrap around', () => {
            systemUnderTest.enterAltMode(TopLevelMenuCount-1)
            systemUnderTest.moveFocusHorizontal(1)
            
            expect(systemUnderTest.FocusedTopLevelMenuIndex).toBe(0)

            expect(systemUnderTest.isAltModeActive).toBe(true)
        })

        test('negative wrap around', () => {
            systemUnderTest.enterAltMode(0)
            systemUnderTest.moveFocusHorizontal(-1)
            
            expect(systemUnderTest.FocusedTopLevelMenuIndex).toBe(TopLevelMenuCount-1)

            expect(systemUnderTest.isAltModeActive).toBe(true)
        })

        test.each([[-2],[2],[0]])('invalid increment %i', (invalidIncrement: number) => {
            const originalIndex = systemUnderTest.FocusedTopLevelMenuIndex
            
            systemUnderTest.moveFocusHorizontal(invalidIncrement)
            
            expect(systemUnderTest.FocusedTopLevelMenuIndex).toBe(originalIndex)
            expect(systemUnderTest.isAltModeActive).toBe(true)
        })

        test('handles null focused index', () => {
            systemUnderTest.closeAll()
            systemUnderTest.moveFocusHorizontal(1)
            
            expect(systemUnderTest.FocusedTopLevelMenuIndex).toBeNull()
            expect(systemUnderTest.isAltModeActive).toBe(false)
        })
    })

    describe('moveFocusVertical', () => {
        beforeEach(() => {
            systemUnderTest.enterAltMode(1)
        })

        test('when top level menu is not expanded', () => {
            systemUnderTest.moveFocusVertical(1)
            
            expect(systemUnderTest.isTopLevelMenuExpanded).toBe(true)
            expect(systemUnderTest.FocusedChildMenuIndex).toBe(0)

            expect(systemUnderTest.isAltModeActive).toBe(true)
        })

        test('negative wrap around', () => {
            systemUnderTest.expandTopLevelMenu(1)
            systemUnderTest.focusChildMenu()
            
            systemUnderTest.moveFocusVertical(-1)
            
            expect(systemUnderTest.FocusedChildMenuIndex).toBe(MenuItemCount-1)
            expect(systemUnderTest.isAltModeActive).toBe(true)
        })

        test('positive wrap around', () => {
            systemUnderTest.expandTopLevelMenu(1)
            systemUnderTest.focusChildMenu()
            for (let i = 0; i < MenuItemCount; i++) {
                systemUnderTest.moveFocusVertical(1)
            }
            
            expect(systemUnderTest.FocusedChildMenuIndex).toBe(0)

            expect(systemUnderTest.isAltModeActive).toBe(true)
        })

        test('invalid increment', () => {
            systemUnderTest.expandTopLevelMenu(1)
            systemUnderTest.focusChildMenu()
            const originalIndex = systemUnderTest.FocusedChildMenuIndex
            
            systemUnderTest.moveFocusVertical(2)
            
            expect(systemUnderTest.FocusedChildMenuIndex).toBe(originalIndex)

            expect(systemUnderTest.isAltModeActive).toBe(true)
        })

        test('when no top level menu is focused', () => {
            systemUnderTest.closeAll()
            
            systemUnderTest.moveFocusVertical(1)
            
            expect(systemUnderTest.isTopLevelMenuExpanded).toBe(false)
            expect(systemUnderTest.FocusedChildMenuIndex).toBeNull()
            
            expect(systemUnderTest.isAltModeActive).toBe(false)
        })
    })

    describe('edge cases', () => {
        test('zero menu count', () => {
            mockTopLevelMenuCount.mockReturnValue(0)
            const emptyMenuState = new TitleBarMenuState(mockTopLevelMenuCount, mockMenuItemsCount)
            
            emptyMenuState.enterAltMode(0)
            
            expect(emptyMenuState.isAltModeActive).toBe(true)
            
            expect(emptyMenuState.isTopLevelMenuExpanded).toBe(false)
            expect(emptyMenuState.FocusedChildMenuIndex).toBeNull
            expect(emptyMenuState.FocusedTopLevelMenuIndex).toBeNull
        })

        test('zero menu items count', () => {
            mockMenuItemsCount.mockReturnValue(0)
            systemUnderTest.enterAltMode(1)
            
            systemUnderTest.moveFocusVertical(1)
            
            expect(systemUnderTest.FocusedChildMenuIndex).toBeNull()
        })
    })
})