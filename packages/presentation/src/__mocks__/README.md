# Svelte Testing Strategy

This project uses an enhanced mocking approach for Svelte components and stores in Jest tests, inspired by Svelte Testing Library patterns but adapted for our current Jest setup.

## Current Approach: Enhanced Svelte Mocking

### What We Have
- **Robust Svelte Store Mocks**: Our `svelte-store.js` mock provides functional implementations of `writable`, `derived`, and `readable` stores with testing helpers
- **Complete Svelte Ecosystem Coverage**: Mocks for `svelte`, `svelte/transition`, `svelte/animate`, and `.svelte` components
- **Jest Integration**: Works seamlessly with our existing Jest configuration without requiring ESM mode

### Benefits
- ✅ **Simple Setup**: No complex ESM configuration required
- ✅ **Fast Tests**: Lightweight mocks don't slow down test execution
- ✅ **Focused Testing**: Tests logic rather than UI components
- ✅ **Backward Compatible**: Works with existing Jest setup

### When This Approach Works Best
- Testing business logic that uses Svelte stores
- Testing utility functions that depend on Svelte ecosystem
- Integration tests that need to mock Svelte dependencies
- When you don't need to test actual Svelte component rendering

## Future: Migration to Svelte Testing Library

### When to Consider Migration
Consider migrating to full Svelte Testing Library when you need to:
- **Test Svelte Components**: Render and interact with actual `.svelte` components
- **Test User Interactions**: Simulate clicks, form inputs, etc. on Svelte components
- **Test Component Props**: Verify how components respond to different prop values
- **Test Component Events**: Verify custom event dispatching

### Migration Steps (Future)
If you need full Svelte Testing Library support:

1. **Install Dependencies**:
   ```bash
   npm install --save-dev @testing-library/svelte svelte-jester jest-environment-jsdom
   ```

2. **Update Jest Configuration** to ESM mode:
   ```javascript
   export default {
     transform: {
       '^.+\\.svelte(\\.(js|ts))?$': 'svelte-jester',
     },
     transformIgnorePatterns: [
       '/node_modules/(?!@testing-library/svelte/)',
     ],
     moduleFileExtensions: ['js', 'svelte', 'ts'],
     extensionsToTreatAsEsm: ['.svelte'],
     testEnvironment: 'jsdom',
     setupFilesAfterEnv: ['<rootDir>/jest-setup.js'],
   }
   ```

3. **Update Package.json** scripts:
   ```json
   {
     "scripts": {
       "test": "npx --node-options=\"--experimental-vm-modules\" jest src"
     }
   }
   ```

### Example Test with Svelte Testing Library
```javascript
import { render, screen, fireEvent } from '@testing-library/svelte'
import MyComponent from './MyComponent.svelte'

test('renders and handles click', async () => {
  render(MyComponent, { props: { title: 'Hello' } })
  
  const button = screen.getByRole('button')
  await fireEvent.click(button)
  
  expect(screen.getByText('Clicked!')).toBeInTheDocument()
})
```

## Current Mock Files

### `__mocks__/svelte-store.js`
- Functional implementations of Svelte stores
- Testing helpers like `_getValue()` and `get()`
- Proper subscriber management

### `__mocks__/svelte.js`
- Core Svelte lifecycle functions (`onMount`, `onDestroy`)
- Utility functions (`tick`, `createEventDispatcher`)

### `__mocks__/svelte-component.js`
- Mock for `.svelte` files
- Returns simple DOM element for component imports

### `__mocks__/svelte-transition.js` & `__mocks__/svelte-animate.js`
- Animation and transition function mocks
- Return basic CSS transformation objects

## Best Practices

1. **Use Store Testing Helpers**: Leverage `_getValue()` for easy store value assertions
2. **Focus on Logic**: Test business logic, not UI rendering details
3. **Mock Appropriately**: Only mock what you need to avoid test complexity
4. **Consider Migration**: Plan for Svelte Testing Library when component testing becomes necessary

## Example Usage

```javascript
import { get } from '../__mocks__/svelte-store.js'

test('store behavior', () => {
  const store = writable(0)
  store.set(5)
  
  expect(get(store)).toBe(5)
  expect(store._getSubscriberCount()).toBe(0)
})
```
