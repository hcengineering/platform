# Huly Unified Color Variables System

This document describes the unified color variables system for Huly components.

## Overview

The Huly color system is based on the following principles:
- Semantic variables describing the purpose of colors
- Maps for organizing colors by categories
- Functions and mixins for convenient color access

## Color System Structure

The system is organized into several categories:

1. **Background (bg)** - colors for background elements
2. **Text (text)** - colors for text elements
3. **Borders (border)** - colors for borders and dividers
4. **Buttons (button)** - colors for buttons and interactive elements
5. **Statuses (status)** - colors for status indicators

## Using the System

### Variables

```scss
// Using predefined variables
.my-element {
  background-color: $bg-panel;
  color: $text-primary;
  border: 1px solid $border-divider;
}
```

### Function huly-color

```scss
// Using the huly-color function
.my-element {
  background-color: huly-color('bg', 'panel');
  color: huly-color('text', 'primary');
  border: 1px solid huly-color('border', 'divider');
}
```

### Mixins

```scss
// Using mixins
.my-element {
  @include bg-color('panel');
  @include text-color('primary');
  @include border-color('divider');
}
```

## Complete Color List

### Background (bg)
- **default**: main background color
- **accent**: accent background color
- **dark**: dark background color
- **panel**: panel color
- **comp-header**: component header color
- **navpanel**: navigation panel color
- **popup**: popup color
- **table-header**: table header color
- **table-row**: table row color

### Text (text)
- **primary**: main text color
- **secondary**: secondary text color
- **tertiary**: tertiary text color
- **caption**: heading color
- **disabled**: color for disabled elements
- **link**: link color

### Borders (border)
- **default**: main border color
- **divider**: divider color
- **navpanel**: divider color in navigation panel
- **focus**: border color on focus
- **table**: table border color

### Buttons (button)
- **default**: main button color
- **hovered**: hover color
- **pressed**: pressed color
- **focused**: focus color
- **disabled**: disabled button color
- **primary-text**: text color for primary buttons
- **primary-default**: main color for primary buttons
- **primary-hovered**: hover color for primary buttons
- **primary-pressed**: pressed color for primary buttons

### Statuses (status)
- **online**: "online" status
- **offline**: "offline" status
- **busy**: "busy" status
- **dnd**: "do not disturb" status

## Provided Mixins

- **@bg-color($type)**: sets background color
- **@text-color($type)**: sets text color
- **@border-color($type)**: sets border color
- **@button-color($type)**: sets button color 