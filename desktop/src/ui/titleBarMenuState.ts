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

export class TitleBarMenuState {
    private altModeActive: boolean = false
    private topLevelMenuExpanded: boolean = false
    private focusedTopLevelMenuIndex: number | null = null
    private focusedChildMenuIndex: number | null = null

    private readonly topLevelMenuCount: () => number;
    private readonly menuItemsCount: (topLevelMenuIndex: number) => number;

    public constructor(
        topLevelMenuCount: () => number,
        menuItemsCount: (topLevelMenuIndex: number) => number
    ) {
        this.topLevelMenuCount = topLevelMenuCount
        this.menuItemsCount = menuItemsCount
    }

    public focusChildMenu() {
        if (null != this.focusedTopLevelMenuIndex && this.topLevelMenuExpanded) {
            this.focusedChildMenuIndex = 0
        }
    }

    public expandTopLevelMenu(topLevelMenuIndex: number): void {
        if (0 > topLevelMenuIndex || topLevelMenuIndex >= this.topLevelMenuCount()) {
            return
        }
        
        if (this.focusedTopLevelMenuIndex === topLevelMenuIndex && this.topLevelMenuExpanded) {
            this.closeAll()
        } else {
            this.focusedTopLevelMenuIndex = topLevelMenuIndex
            this.topLevelMenuExpanded = true
        }
    }

    public exitAltMode(): void {
        this.altModeActive = false
    }

    public enterAltMode(topLevelMenuIndex: number | null): void {
        this.altModeActive = true
        
        if (null == topLevelMenuIndex || 0 > topLevelMenuIndex || topLevelMenuIndex >= this.topLevelMenuCount()) {
            return
        }
        
        this.focusedTopLevelMenuIndex = topLevelMenuIndex
    }

    public closeAll(): void {
        this.altModeActive = false
        this.topLevelMenuExpanded = false
        this.focusedTopLevelMenuIndex = null
        this.focusedChildMenuIndex = null
    }

    public defocus(): void {
        if (this.topLevelMenuExpanded) {
            this.topLevelMenuExpanded = false
            this.focusedChildMenuIndex = null
        } else {
            this.closeAll();
        }
    }

    public moveFocusHorizontal(increment: number): void {
        if (Math.abs(increment) != 1 || null == this.focusedTopLevelMenuIndex) {
            return;
        }
        
        const topLevelMenuCount = this.topLevelMenuCount()
        this.focusedTopLevelMenuIndex = (this.focusedTopLevelMenuIndex + topLevelMenuCount + increment) % topLevelMenuCount
        
        if (this.topLevelMenuExpanded) {
            this.focusedChildMenuIndex = 0
        }
    }

    public moveFocusVertical(increment: number): void {
        if (Math.abs(increment) != 1 || null == this.focusedTopLevelMenuIndex) {
            return;
        }

        const menuItemsCount = this.menuItemsCount(this.focusedTopLevelMenuIndex)

        this.topLevelMenuExpanded = true

        if (menuItemsCount === 0) {
            return;
        }

        this.focusedChildMenuIndex = ((this.focusedChildMenuIndex ?? -1) + menuItemsCount + increment) % menuItemsCount
    }

    public get isAltModeActive(): boolean {
        return this.altModeActive
    }

    public get isTopLevelMenuExpanded(): boolean {
        return this.topLevelMenuExpanded
    }

    public get FocusedTopLevelMenuIndex(): number | null {
        return this.focusedTopLevelMenuIndex
    }

    public get FocusedChildMenuIndex(): number | null {
        return this.focusedChildMenuIndex
    }
}