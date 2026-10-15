# UI component catalog

This catalog covers the Svelte components exported by [`@hcengineering/ui`](../src/index.ts). It is organized by purpose so that related components can be found and compared quickly.

Import components from the package entry point:

```ts
import { Button, Dialog, SearchInput } from '@hcengineering/ui'
```

The catalog is a discovery guide, not a duplicate API reference. Refer to the linked component source for the current props, events, and slots. Components whose names include `Modern` are parallel design variants; the name alone does not imply that another component is deprecated.

## Buttons and actions

| Component | Purpose |
| --- | --- |
| [`Button`](../src/components/Button.svelte) | General-purpose button with the established UI appearance and behavior. |
| [`ButtonBase`](../src/components/ButtonBase.svelte) | Low-level button primitive for composing custom button variants. |
| [`ModernButton`](../src/components/ModernButton.svelte) | Button variant for interfaces using the modern visual language. |
| [`HeaderButton`](../src/components/HeaderButton.svelte) | Action button sized and styled for headers and toolbars. |
| [`ButtonIcon`](../src/components/ButtonIcon.svelte) | Compact button whose primary content is an icon. |
| [`CircleButton`](../src/components/CircleButton.svelte) | Circular icon-oriented action button. |
| [`ActionIcon`](../src/components/ActionIcon.svelte) | Lightweight icon action for inline controls and toolbars. |
| [`ButtonWithDropdown`](../src/components/ButtonWithDropdown.svelte) | Primary button combined with a dropdown trigger. |
| [`ButtonGroup`](../src/components/ButtonGroup.svelte) | Groups related buttons into a single control. |
| [`ButtonMenu`](../src/components/ButtonMenu.svelte) | Button that exposes a menu of actions. |
| [`SplitButton`](../src/components/SplitButton.svelte) | Separates a primary action from its secondary action menu. |
| [`FilterButton`](../src/components/FilterButton.svelte) | Button specialized for enabling or configuring filters. |
| [`StatusBarButton`](../src/components/StatusBarButton.svelte) | Compact action intended for a status bar. |
| [`Like`](../src/components/Like.svelte) | Toggleable like or reaction action. |

## Form controls and text input

| Component | Purpose |
| --- | --- |
| [`EditBox`](../src/components/EditBox.svelte) | Standard single-line editable text control. |
| [`ModernEditbox`](../src/components/ModernEditbox.svelte) | Single-line text control using the modern visual language. |
| [`StylishEdit`](../src/components/StylishEdit.svelte) | Visually emphasized text editing control. |
| [`EditWithIcon`](../src/components/EditWithIcon.svelte) | Text input combined with a leading or trailing icon. |
| [`SearchEdit`](../src/components/SearchEdit.svelte) | Editable search control for query entry. |
| [`SearchInput`](../src/components/SearchInput.svelte) | Search field with search-specific interaction and appearance. |
| [`SearchPicker`](../src/components/SearchPicker.svelte) | Search input combined with picking a result or option. |
| [`TextArea`](../src/components/TextArea.svelte) | Standard multiline text input. |
| [`TextAreaEditor`](../src/components/TextAreaEditor.svelte) | Multiline editor wrapper with editing-oriented behavior. |
| [`PlainTextEditor`](../src/components/PlainTextEditor.svelte) | Editor for plain-text content without rich-text semantics. |
| [`NumberInput`](../src/components/NumberInput.svelte) | Input specialized for numeric values. |
| [`CodeInput`](../src/components/CodeInput.svelte) | Input specialized for entering code-like values. |
| [`CodeForm`](../src/components/CodeForm.svelte) | Form container for code input and related actions. |
| [`FormGroup`](../src/components/forms/FormGroup.svelte) | Groups related fields within a form. |
| [`FormRow`](../src/components/forms/FormRow.svelte) | Arranges form content as a row. |
| [`FormInputField`](../src/components/forms/FormInputField.svelte) | Provides field layout and supporting form metadata around an input. |
| [`Label`](../src/components/Label.svelte) | Renders a localized UI label. |
| [`CheckBox`](../src/components/CheckBox.svelte) | Standard boolean checkbox control. |
| [`ModernCheckbox`](../src/components/ModernCheckbox.svelte) | Checkbox variant for the modern visual language. |
| [`Toggle`](../src/components/Toggle.svelte) | Standard on/off switch. |
| [`ModernToggle`](../src/components/ModernToggle.svelte) | On/off switch for the modern visual language. |
| [`ToggleWithLabel`](../src/components/ToggleWithLabel.svelte) | Toggle paired with a descriptive label. |
| [`MiniToggle`](../src/components/MiniToggle.svelte) | Compact on/off switch for dense layouts. |
| [`ToggleButton`](../src/components/ToggleButton.svelte) | Button that represents and changes a binary state. |
| [`RadioButton`](../src/components/RadioButton.svelte) | Standard single-choice radio control. |
| [`ModernRadioButton`](../src/components/ModernRadioButton.svelte) | Radio control for the modern visual language. |
| [`RadioGroup`](../src/components/RadioGroup.svelte) | Coordinates a set of mutually exclusive radio options. |
| [`Switcher`](../src/components/Switcher.svelte) | Switches between a small set of modes or values. |
| [`SwitcherBase`](../src/components/SwitcherBase.svelte) | Lower-level primitive for custom switcher controls. |
| [`ModeSelector`](../src/components/ModeSelector.svelte) | Selects an application or view mode. |
| [`TimeInputBox`](../src/components/calendar/TimeInputBox.svelte) | Text-like control for entering a time value. |

## Selection, dropdowns, and menus

| Component | Purpose |
| --- | --- |
| [`Dropdown`](../src/components/Dropdown.svelte) | General dropdown selector and trigger. |
| [`DropdownPopup`](../src/components/DropdownPopup.svelte) | Popup content used by a dropdown selector. |
| [`DropdownLabels`](../src/components/DropdownLabels.svelte) | Dropdown for selecting label values. |
| [`DropdownLabelsPopup`](../src/components/DropdownLabelsPopup.svelte) | Popup used to choose label values. |
| [`DropdownLabelsIntl`](../src/components/DropdownLabelsIntl.svelte) | Label dropdown whose options use localized strings. |
| [`DropdownLabelsPopupIntl`](../src/components/DropdownLabelsPopupIntl.svelte) | Localized label-selection popup. |
| [`DropdownRecord`](../src/components/DropdownRecord.svelte) | Dropdown that selects a record-like item. |
| [`SelectPopup`](../src/components/SelectPopup.svelte) | Generic popup for choosing one of a set of items. |
| [`ColorPopup`](../src/components/ColorPopup.svelte) | Popup for choosing a color. |
| [`PopupMenu`](../src/components/PopupMenu.svelte) | Menu rendered inside popup infrastructure. |
| [`Menu`](../src/components/Menu.svelte) | General action or option menu. |
| [`Submenu`](../src/components/Submenu.svelte) | Nested menu section opened from a parent menu item. |
| [`NestedMenu`](../src/components/NestedMenu.svelte) | Menu supporting hierarchical options. |
| [`NestedDropdown`](../src/components/NestedDropdown.svelte) | Dropdown selector supporting hierarchical options. |
| [`NestedSelectPopup`](../src/components/NestedSelectPopup.svelte) | Hierarchical item-selection popup. |
| [`FilterCategoryPopup`](../src/components/FilterCategoryPopup.svelte) | Popup for selecting or configuring a filter category. |
| [`Chip`](../src/components/Chip.svelte) | Compact representation of a selected value, tag, or filter. |

## Navigation and disclosure

| Component | Purpose |
| --- | --- |
| [`Tabs`](../src/components/Tabs.svelte) | Standard tabbed navigation container. |
| [`TabsControl`](../src/components/TabsControl.svelte) | Control surface for selecting among tabs. |
| [`TabList`](../src/components/TabList.svelte) | Renders a list of tab items. |
| [`ModernTab`](../src/components/ModernTab.svelte) | Individual tab for the modern visual language. |
| [`Breadcrumb`](../src/components/Breadcrumb.svelte) | A single breadcrumb navigation item. |
| [`Breadcrumbs`](../src/components/Breadcrumbs.svelte) | Breadcrumb trail for hierarchical navigation. |
| [`NavItem`](../src/components/NavItem.svelte) | Individual navigation entry. |
| [`NavGroup`](../src/components/NavGroup.svelte) | Groups related navigation entries. |
| [`Chevron`](../src/components/Chevron.svelte) | Directional disclosure indicator. |
| [`AccordionItem`](../src/components/AccordionItem.svelte) | Expandable section in an accordion-style layout. |
| [`Fold`](../src/components/Fold.svelte) | Collapsible content region. |
| [`ExpandCollapse`](../src/components/ExpandCollapse.svelte) | Control for expanding and collapsing associated content. |
| [`Expandable`](../src/components/Expandable.svelte) | Container that reveals or hides additional content. |
| [`ShowMore`](../src/components/ShowMore.svelte) | Reveals content beyond an initially limited view. |
| [`Hotkey`](../src/components/Hotkey.svelte) | Displays a keyboard shortcut. |
| [`HotkeyGroup`](../src/components/HotkeyGroup.svelte) | Displays a sequence or group of shortcut keys. |

## Layout and containers

| Component | Purpose |
| --- | --- |
| [`Grid`](../src/components/Grid.svelte) | Grid-based layout container. |
| [`Row`](../src/components/Row.svelte) | Horizontal layout row. |
| [`Section`](../src/components/Section.svelte) | Visually and semantically groups related content. |
| [`SectionEmpty`](../src/components/SectionEmpty.svelte) | Empty-state content for a section. |
| [`Separator`](../src/components/Separator.svelte) | Visual separator between adjacent areas or items. |
| [`Header`](../src/components/Header.svelte) | Page, panel, or section header layout. |
| [`SettingsCard`](../src/components/SettingsCard.svelte) | Card container for one settings area. |
| [`SettingsCardsLayout`](../src/components/SettingsCardsLayout.svelte) | Arranges multiple settings cards. |
| [`SettingsFooterAction`](../src/components/SettingsFooterAction.svelte) | Footer action row for settings content. |
| [`Panel`](../src/components/Panel.svelte) | General panel container. |
| [`PanelInstance`](../src/components/PanelInstance.svelte) | Runtime-rendered panel instance integrated with panel infrastructure. |
| [`ScrollBox`](../src/components/ScrollBox.svelte) | Content container with managed overflow. |
| [`Scroller`](../src/components/Scroller.svelte) | Scrollable content area with custom scrolling behavior. |
| [`ScrollerBar`](../src/components/ScrollerBar.svelte) | Scrollbar used by the custom scroller. |
| [`Dock`](../src/components/Dock.svelte) | Container for docked UI content. |
| [`BarDashboard`](../src/components/BarDashboard.svelte) | Dashboard-style bar visualization and layout. |

## Dialogs, popups, and wizards

| Component | Purpose |
| --- | --- |
| [`Dialog`](../src/components/Dialog.svelte) | Standard dialog content and layout. |
| [`ModernDialog`](../src/components/ModernDialog.svelte) | Dialog variant for the modern visual language. |
| [`Modal`](../src/components/Modal.svelte) | Modal overlay container that blocks interaction with underlying content. |
| [`Popup`](../src/components/Popup.svelte) | General anchored or contextual popup. |
| [`PopupInstance`](../src/components/PopupInstance.svelte) | Runtime-rendered popup instance integrated with popup infrastructure. |
| [`ModernPopup`](../src/components/ModernPopup.svelte) | Popup variant for the modern visual language. |
| [`TooltipInstance`](../src/components/TooltipInstance.svelte) | Runtime-rendered tooltip content. |
| [`Wizard`](../src/components/wizard/Wizard.svelte) | Coordinates a multi-step flow. |
| [`ModernWizardDialog`](../src/components/wizard/ModernWizardDialog.svelte) | Dialog container for a modern multi-step flow. |
| [`ModernWizardBar`](../src/components/wizard/ModernWizardBar.svelte) | Progress and navigation bar for a modern wizard. |
| [`StepsDialog`](../src/components/StepsDialog.svelte) | Dialog that presents content as a sequence of steps. |

## Status, progress, and notifications

| Component | Purpose |
| --- | --- |
| [`Status`](../src/components/Status.svelte) | General status indicator. |
| [`StatusBadge`](../src/components/StatusBadge.svelte) | Compact badge representing a status. |
| [`StateTag`](../src/components/StateTag.svelte) | Tag-style representation of an object's state. |
| [`Notice`](../src/components/Notice.svelte) | Inline informational, warning, or error notice. |
| [`Progress`](../src/components/Progress.svelte) | Linear progress indicator. |
| [`ProgressCircle`](../src/components/ProgressCircle.svelte) | Circular progress indicator. |
| [`MultiProgress`](../src/components/MultiProgress.svelte) | Progress display composed of multiple segments or values. |
| [`Loading`](../src/components/Loading.svelte) | General loading-state indicator. |
| [`LoadingScreen`](../src/components/LoadingScreen.svelte) | Full-area loading state. |
| [`Spinner`](../src/components/Spinner.svelte) | Indeterminate spinning activity indicator. |
| [`ErrorPresenter`](../src/components/ErrorPresenter.svelte) | Presents an error in a user-facing form. |
| [`BooleanIcon`](../src/components/BooleanIcon.svelte) | Visualizes a boolean value as an icon. |
| [`NotificationToast`](../src/components/NotificationToast.svelte) | Temporary toast notification. |
| [`Notifications`](../src/components/notifications/Notifications.svelte) | Renders notifications managed by the shared notification store. |

## Date and time

| Component | Purpose |
| --- | --- |
| [`DatePicker`](../src/components/calendar/DatePicker.svelte) | Calendar-based date selector. |
| [`DateRangePicker`](../src/components/calendar/DateRangePicker.svelte) | Calendar-based date-range selector. |
| [`DatePopup`](../src/components/calendar/DatePopup.svelte) | Popup for selecting a date. |
| [`SimpleDatePopup`](../src/components/calendar/SimpleDatePopup.svelte) | Compact date-selection popup. |
| [`RangeDatePopup`](../src/components/calendar/RangeDatePopup.svelte) | Popup for choosing a bounded date range. |
| [`DateRangePopup`](../src/components/calendar/DateRangePopup.svelte) | Date-range popup with range-specific interactions. |
| [`TimePopup`](../src/components/calendar/TimePopup.svelte) | Popup for choosing a time. |
| [`SimpleTimePopup`](../src/components/calendar/SimpleTimePopup.svelte) | Compact time-selection popup. |
| [`MonthCalendar`](../src/components/calendar/MonthCalendar.svelte) | Month-oriented calendar view. |
| [`YearCalendar`](../src/components/calendar/YearCalendar.svelte) | Year-oriented calendar view. |
| [`WeekCalendar`](../src/components/calendar/WeekCalendar.svelte) | Week-oriented calendar view. |
| [`MonthSquare`](../src/components/calendar/MonthSquare.svelte) | Compact month tile used in calendar selection. |
| [`Month`](../src/components/calendar/Month.svelte) | Renders an individual month view. |
| [`DatePresenter`](../src/components/calendar/DatePresenter.svelte) | Formats and displays a date. |
| [`DueDatePresenter`](../src/components/calendar/DueDatePresenter.svelte) | Displays a due date with due-state semantics. |
| [`DateTimePresenter`](../src/components/calendar/DateTimePresenter.svelte) | Formats and displays a date and time. |
| [`DateRangePresenter`](../src/components/calendar/DateRangePresenter.svelte) | Formats and displays a date range. |
| [`DateTimeRangePresenter`](../src/components/calendar/DateTimeRangePresenter.svelte) | Formats and displays a date-and-time range. |
| [`TimeSince`](../src/components/TimeSince.svelte) | Displays elapsed time relative to a timestamp. |
| [`TimeLeft`](../src/components/TimeLeft.svelte) | Displays the remaining time until a timestamp. |
| [`Timeline`](../src/components/Timeline.svelte) | Presents events or values along a time sequence. |
| [`TimeShiftPicker`](../src/components/TimeShiftPicker.svelte) | Selects a relative time shift. |
| [`TimeShiftPresenter`](../src/components/TimeShiftPresenter.svelte) | Displays a relative time-shift value. |
| [`TimeZonesPopup`](../src/components/TimeZonesPopup.svelte) | Popup for choosing a time zone. |

## Lists and focus management

| Component | Purpose |
| --- | --- |
| [`ListView`](../src/components/ListView.svelte) | General list presentation. |
| [`InteractiveListView`](../src/components/InteractiveListView.svelte) | List with keyboard, focus, and selection interactions. |
| [`ListViewItem`](../src/components/ListViewItem.svelte) | Individual item used within list views. |
| [`FocusHandler`](../src/components/FocusHandler.svelte) | Connects rendered content to shared focus handling. |

## Content, media, and dynamic rendering

| Component | Purpose |
| --- | --- |
| [`Component`](../src/components/Component.svelte) | Resolves and renders a dynamically supplied UI component. |
| [`Lazy`](../src/components/Lazy.svelte) | Defers component or content rendering until it is needed. |
| [`Html`](../src/components/Html.svelte) | Renders HTML content using the package's HTML handling. |
| [`EmbeddedHTML`](../src/components/EmbeddedHTML.svelte) | Displays an embedded HTML document or fragment. |
| [`EmbeddedPDF`](../src/components/EmbeddedPDF.svelte) | Displays embedded PDF content. |
| [`Image`](../src/components/Image.svelte) | Displays image content with shared UI behavior. |
| [`Video`](../src/components/Video.svelte) | Displays video content with shared player behavior. |
| [`Blurhash`](../src/components/Blurhash.svelte) | Renders a BlurHash placeholder for an image. |
| [`Icon`](../src/components/Icon.svelte) | Resolves and renders a supplied icon component. |
| [`WorkspaceAvatar`](../src/components/WorkspaceAvatar.svelte) | Displays an avatar for a workspace. |
| [`TraceXLogo`](../src/components/TraceXLogo.svelte) | Displays the TraceX logo in supported variants. |
| [`Link`](../src/components/Link.svelte) | Styled link integrated with UI navigation behavior. |
| [`LinkWrapper`](../src/components/LinkWrapper.svelte) | Adds link behavior around supplied content. |

## Icons

Icons are Svelte components and use the `Icon` export prefix. Choose an icon by meaning rather than by its current visual details.

| Group | Components |
| --- | --- |
| Creation and editing | `IconAdd`, `IconCircleAdd`, `IconEdit`, `IconActivityEdit`, `IconCopy`, `IconDelete`, `IconUndo`, `IconRedo`, `IconScribble` |
| Navigation and direction | `IconBack`, `IconForward`, `IconLeft`, `IconRight`, `IconUp`, `IconDown`, `IconUpOutline`, `IconDownOutline`, `IconArrowLeft`, `IconArrowRight`, `IconNavPrev`, `IconNavNext`, `IconChevronLeft`, `IconChevronRight`, `IconChevronDown`, `IconDropdown`, `IconDropdownDown`, `IconDropdownRight`, `IconOpenedArrow`, `IconCollapseArrow`, `IconToDetails` |
| Files and organization | `IconFile`, `IconFolder`, `IconFolderCollapsed`, `IconFolderExpanded`, `IconArchive`, `IconAttachment`, `IconThread`, `IconTableOfContents`, `IconDescription` |
| Actions and state | `IconStart`, `IconStop`, `IconClose`, `IconOpen`, `IconExpand`, `IconMaximize`, `IconMinimize`, `IconMinWidth`, `IconMaxWidth`, `IconScale`, `IconScaleFull`, `IconCheck`, `IconCheckAll`, `IconCheckCircle`, `IconCheckmark`, `IconBlueCheck`, `IconError`, `IconInfo`, `IconLike`, `IconActivity`, `IconHistory` |
| Search, filtering, and options | `IconSearch`, `IconFilter`, `IconOptions`, `IconOptionsAsc`, `IconOptionDsc`, `IconMoreH`, `IconMoreV`, `IconMoreV2`, `IconSettings` |
| Communication and sharing | `IconSend`, `IconShare`, `IconLink` |
| Calendar | `IconCalendar`, `IconDPCalendar`, `IconDPCalendarOver` |
| Window and layout | `IconDetails`, `IconDetailsFilled`, `IconSquareExpand`, `IconMenuOpen`, `IconMenuClose`, `IconCircles`, `IconMixin`, `IconColStar` |
| Keyboard modifiers | `IconKeyCommand`, `IconKeyOption`, `IconKeyShift` |

## Choosing between similar components

| Need | Start with | Consider instead when |
| --- | --- | --- |
| Trigger an action | `Button` | Use `ButtonIcon`, `CircleButton`, or `ActionIcon` for compact icon-only actions; use `ModernButton` when matching an existing modern surface. |
| Enter one line of text | `EditBox` | Use `ModernEditbox` when matching an existing modern surface, or `SearchInput` for search semantics. |
| Choose a value from a popup | `Dropdown` | Use `SelectPopup` when you already own the trigger, or a specialized label, record, color, or nested selector. |
| Show transient contextual content | `Popup` | Use `TooltipInstance` for hints and `Modal` or `Dialog` for focused workflows. |
| Present a focused workflow | `Dialog` | Use `Wizard` or `StepsDialog` when the workflow has explicit steps; use a modern variant only within a matching surface. |
| Display loading state | `Loading` | Use `Spinner` for a small indeterminate indicator, `Progress` for known progress, or `LoadingScreen` for a full area. |

## Maintaining this catalog

- Document components only after they are exported from [`src/index.ts`](../src/index.ts).
- Add each component to exactly one primary category; mention alternatives in its description or in the comparison table.
- Keep descriptions focused on intent and selection. Do not copy the full props API into this document.
- Update or remove the catalog entry in the same change that renames, stops exporting, or replaces a component.
- Mark deprecation explicitly in source and in this catalog; do not infer it solely from names such as `Modern`.
