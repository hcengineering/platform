Process DSL — context expressions

This document describes the small DSL used to reference parts of a process execution context and to apply "modifiers" (functions, source reducers, fallbacks) to those references. The implementation lives in `src/dslContext.ts` and the tests are at `src/__tests__/dslContext.test.ts`.

Overview
--------

A DSL expression is always enclosed in `${...}` when embedded. The parser and serializer in this package support converting between the typed `SelectedContext` objects and their compact DSL string.

Top-level expression types
-------------------------

- Attribute: `@<key>` — references an attribute on the current object.
  - Example: `@name`

- Nested attribute: `@<refKey>.<attrKey>` — follows a reference attribute to another object and takes its attribute.
  - Example: `@owner.id`

- Relation: `$relation(<associationRef>,<direction>,<key>,<name>)`
  - Example: `$relation(my.assoc, A, id, title)`

- Execution context: `$context(<id>,<key>)`
  - Example: `$context(12345, result)`

- User request: `$userRequest(<id>,<key>,<_class>)`
  - Example: `$userRequest(123, value, MyClass)`

- Const: `#<value>,<key>` — a literal value and a target key.
  - Numbers, booleans, `null`/`undefined`, quoted strings and arrays are supported.
  - Example: `#42,answer` or `#"hello",greeting` or `#[1,2,3],arr`

- Function as primary expression: `=><funcRef>(<props...>)`
  - Example: `=>myFunc(a=1,b="x")`

Modifiers
---------

Modifiers always start with `=>` and are appended after the main expression separated by spaces (at top-level). Examples:

- Source reducer: `=>SOURCE(<funcRef>,<props...>)`
- Fallback: `=>FALLBACK(<props...>)` or `=>FALLBACK(<value>)`
- Arbitrary function modifiers: `=><funcRef>(<props...>)`

Important parsing details
-------------------------

- Splitting into expression + modifiers is done at top-level only — the parser ignores `=>` inside nested brackets, quotes and template expressions `${...}`.
- The tokenizer respects nested parentheses `()`, arrays `[]`, object braces `{}`, quoted strings (single/double) with escapes, and `${...}` template blocks.
- `simplifyFuncRef` is used when serializing to shorten function references; `expandFuncRef` restores those during parsing.

Examples
--------

- `${@name}` — attribute `name`
- `${@owner.id =>MYFUNC(a=1) =>FALLBACK(10)}` — nested attribute with a function modifier and a fallback
- `${#"he\"llo",greet}` — const string with escaped quote
- `${=>COMPUTE(sum=1)}` — function as primary expression
