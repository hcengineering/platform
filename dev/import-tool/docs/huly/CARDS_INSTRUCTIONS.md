# Card Import Format Guide

## Directory Structure


All files are organized in the following structure:

```
workspace/
├── Recipes.yaml              # Base type configuration
├── Recipes/                  # Base type cards folder
│   ├── Classic Margherita Pizza.md
│   └── Chocolate Lava Cake.md
└── Recipes/Vegan/           # Child type folder
    ├── Vegan Recipe.yaml    # Child type configuration
    └── Mushroom Risotto.md  # Child type card
```

## Types (Master Tags)

Types are described in YAML files and define the structure of cards.

### Base Type
Create file `Recipes.yaml`:

```
class: card:class:MasterTag
title: Recipe
properties:
  - label: cookingTime    # Property name
    type: TypeString      # Data type
  - label: servings
    type: TypeNumber
  # ... other properties
```

### Child Type
Create file `Recipes/Vegan/Vegan Recipe.yaml`:

```
class: card:class:MasterTag
title: Vegan Recipe
properties:
  - label: proteinSource
    type: TypeString
  # ... additional properties
```

## Cards

Cards are Markdown files with YAML header and content.

### Base Type Card
Create file `Recipes/Classic Margherita Pizza.md`:

```
title: Classic Margherita Pizza
cookingTime: 30 minutes
servings: 4
difficulty: Medium
category: Italian
calories: 850
chef: Mario Rossi
```

# Content in Markdown format
## Sections
- Lists
- Instructions
- Notes

### Child Type Card
Create file `Recipes/Vegan/Mushroom Risotto.md`:

```
title: Vegan Mushroom Risotto
cookingTime: 45 minutes
servings: 4
difficulty: Medium
category: Italian
calories: 380
chef: Maria Green
proteinSource: Mushrooms    # Child type properties
isGlutenFree: true
allergens: None
```

# Content in Markdown format

## Important Rules

1. File Names:
   - Type YAML files must end with `.yaml`
   - Cards must have `.md` extension
   - File names can contain spaces

2. Directory Structure:
   - Child types must be in a subfolder named after the type
   - Child type cards must be in the same folder as its configuration

3. Card YAML Header:
   - Must start and end with `---`
   - Must contain all properties defined in the type
   - Values must match specified data types

4. Card Content:
   - After YAML header goes regular Markdown text
   - Can use all Markdown features (headings, lists, tables, etc.)

## Examples from Our System

1. Base Recipe Type:
   - File: `Recipes.yaml`
   - Defines basic recipe properties (cooking time, servings, difficulty, etc.)

2. Base Type Cards:
   - `Recipes/Classic Margherita Pizza.md` - pizza recipe
   - `Recipes/Chocolate Lava Cake.md` - dessert recipe

3. Vegan Recipe Child Type:
   - File: `Recipes/Vegan/Vegan Recipe.yaml`
   - Adds specific properties (protein source, gluten-free, allergens)

4. Child Type Card:
   - `Recipes/Vegan/Mushroom Risotto.md` - vegan risotto
   - Uses both base properties and vegan type properties

## Supported Data Types (to be extended)

- TypeString - text values
- TypeNumber - numeric values
- TypeBoolean - yes/no (true/false)
- TypeDate - dates
- TypeHyperlink - links
- TypeEnum - enumeration (list of possible values) (not supported yet)