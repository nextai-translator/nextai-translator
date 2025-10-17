# UUID
36c6fca9-982d-458c-88c7-10323421cb47

# Trigger
How is styling handled in this project? What CSS-in-JS solutions are used?

# Content
## Styling System

The project uses **CSS-in-JS** with multiple styling solutions.

## Primary Styling Libraries

### 1. Styletron
**Engine**: styletron-engine-atomic (v1.5.0)
**React Integration**: styletron-react (v6.1.0)

**Purpose**: Atomic CSS-in-JS engine
**Use Cases**:
- Base Web UI component styling
- Dynamic styles
- Optimal CSS generation (atomic classes)

**How it works**:
- Generates minimal atomic CSS classes
- Each style property → single class
- Automatic deduplication
- Runtime style injection

**Setup Pattern**:
```typescript
import { Provider as StyletronProvider } from 'styletron-react'
import { Client as Styletron } from 'styletron-engine-atomic'

const engine = new Styletron()

<StyletronProvider value={engine}>
    <App />
</StyletronProvider>
```

### 2. Base Web UI (BaseUI-SD)
**Version**: v12.2.4

**Purpose**: Uber's Base Web design system
**Components**:
- Pre-built UI components
- Theming system
- Responsive design
- Accessibility built-in

**Features**:
- Built on Styletron
- Customizable theme
- Dark/light mode support
- TypeScript support

**Usage**:
```typescript
import { Button } from 'baseui-sd/button'
import { useStyletron } from 'baseui-sd'

function Component() {
    const [css, theme] = useStyletron()
    return <Button>Click me</Button>
}
```

### 3. JSS (react-jss)
**Version**: v10.10.0

**Purpose**: CSS-in-JS with JSS
**Use Cases**:
- Complex styling logic
- Class-based styling
- Style composition
- Legacy component styling

**Pattern**:
```typescript
import { createUseStyles } from 'react-jss'

const useStyles = createUseStyles({
    button: {
        background: 'blue',
        '&:hover': {
            background: 'darkblue',
        },
    },
})

function Component() {
    const classes = useStyles()
    return <button className={classes.button}>Click</button>
}
```

## Theming System

### Theme Types
Defined in `src/common/types.ts`:
```typescript
export type BaseThemeType = 'light' | 'dark'
export type ThemeType = BaseThemeType | 'followTheSystem'
```

### IThemedStyleProps
Standard props for themed components:
```typescript
interface IThemedStyleProps {
    theme: Theme              // Base Web theme object
    themeType: BaseThemeType  // 'light' | 'dark'
    isDesktopApp?: boolean    // Platform-specific styling
    showLogo?: boolean        // Feature flags
}
```

### Theme Context
- Base Web provides theme via Context
- Accessible via `useStyletron()` hook
- Theme switching updates all components reactively

### System Theme Detection
- "followTheSystem" mode
- Detects OS dark mode preference
- Uses `prefers-color-scheme` media query

## Styling Patterns

### 1. Base Web Components
```typescript
import { Button } from 'baseui-sd/button'
import { ALIGN, SIZE } from 'baseui-sd/button'

<Button
    size={SIZE.compact}
    kind={KIND.secondary}
    overrides={{
        BaseButton: {
            style: ({ $theme }) => ({
                backgroundColor: $theme.colors.primary,
            }),
        },
    }}
>
    Click
</Button>
```

### 2. Custom Styled Components
```typescript
import { styled } from 'baseui-sd'

const StyledDiv = styled('div', ({ $theme, $isActive }) => ({
    padding: $theme.sizing.scale400,
    backgroundColor: $isActive ? $theme.colors.primary : 'transparent',
}))
```

### 3. Inline Styles (with Styletron)
```typescript
function Component() {
    const [css] = useStyletron()
    return (
        <div className={css({
            display: 'flex',
            padding: '16px',
        })}>
            Content
        </div>
    )
}
```

### 4. JSS Classes
```typescript
const useStyles = createUseStyles((theme) => ({
    container: {
        padding: theme.spacing.scale400,
        background: theme.colors.background,
    },
}))
```

## Utility Classes

### clsx (v1.2.1)
Conditional className composition:
```typescript
import clsx from 'clsx'

<div className={clsx(
    'base-class',
    isActive && 'active',
    isPrimary && 'primary'
)}>
```

## Responsive Design

### Base Web Breakpoints
Built-in responsive utilities:
- Mobile first approach
- Breakpoint system
- Responsive props on components

### Media Queries
Via Styletron or JSS:
```typescript
{
    '@media (max-width: 768px)': {
        flexDirection: 'column',
    },
}
```

## Color Management

### color (v4.2.3)
Color manipulation library:
```typescript
import Color from 'color'

const lightBackground = Color(theme.colors.primary).lighten(0.2).hex()
```

## Platform-Specific Styling

### Desktop (Tauri)
```typescript
interface IThemedStyleProps {
    isDesktopApp?: boolean
}

const styles = {
    header: {
        // Tauri uses custom window controls
        WebkitAppRegion: isDesktopApp ? 'drag' : 'auto',
    },
}
```

### Browser Extension
Different constraints:
- Must work on any website
- Shadow DOM isolation (likely)
- z-index management
- Prevent conflicts with page styles

## Performance Considerations

### Atomic CSS (Styletron)
Benefits:
- Minimal CSS output
- Deduplication automatic
- Fast runtime performance
- Small bundle size

### Critical CSS
- Inline critical styles
- Lazy load non-critical
- Code splitting per platform

### Dynamic Styles
- Runtime generation via Styletron
- Cached style sheets
- Efficient updates

## Styling Best Practices (Inferred)

### Consistency
- Use theme values (not hardcoded)
- Follow Base Web conventions
- Consistent spacing scale

### Maintainability
- Co-locate styles with components
- Use typed theme object
- Avoid magic numbers

### Accessibility
- Base Web has built-in a11y
- Focus styles
- Color contrast compliance
- ARIA attributes

### Dark Mode
- Theme-aware colors
- Test in both modes
- System preference support
- Manual toggle option

## Why Multiple Styling Solutions?

### Historical Reasons
- JSS may be legacy
- Transition to Styletron + Base Web
- Gradual migration

### Complementary Strengths
- Base Web: Component library
- Styletron: Atomic CSS engine
- JSS: Complex custom styling
- Inline: Quick one-off styles

### Bundle Impact
All libraries are relatively small:
- Styletron: ~5KB
- Base Web: Tree-shakeable
- JSS: ~12KB