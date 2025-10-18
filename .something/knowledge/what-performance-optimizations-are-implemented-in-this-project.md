# UUID
ee455cef-efc1-4693-a19c-a368c7383ac4

# Trigger
What performance optimizations are implemented in this project?

# Content
## Performance Optimizations

The project employs various strategies to ensure fast, responsive performance across all platforms.

## Build-Time Optimizations

### Code Splitting
Vite automatic code splitting:
- **Route-based**: Different windows/pages are separate bundles
- **Vendor chunks**: React, UI libs separated
- **Dynamic imports**: Lazy load features
- **Tree shaking**: Remove unused code

### Bundle Size
- **Vite**: Optimized production builds
- **Rollup**: Behind Vite, efficient bundling
- **Minification**: JavaScript and CSS minified
- **Compression**: Gzip/Brotli for assets

### Asset Optimization
- **Images**: Optimized and resized
- **SVG**: Inline small SVGs, load large ones
- **Fonts**: Subset and optimize
- **Icons**: Icon library with tree-shaking

## Runtime Optimizations

### React Performance

#### Memoization
```typescript
// Expensive computations
const result = useMemo(() => {
    return expensiveOperation(data)
}, [data])

// Stable callbacks
const handleClick = useCallback(() => {
    // handler
}, [deps])
```

#### Component Optimization
- **React.memo**: Prevent unnecessary re-renders
- **PureComponent pattern**: Shallow prop comparison
- **Key props**: Proper keys for lists

#### Virtualization
**react-window** (v1.8.9):
- Render only visible items
- Huge lists stay performant
- Vocabulary, translation history lists

Example:
```typescript
import { FixedSizeList } from 'react-window'

<FixedSizeList
    height={600}
    itemCount={1000}
    itemSize={35}
>
    {Row}
</FixedSizeList>
```

### State Management Performance

#### Jotai
- **Atomic updates**: Only affected components re-render
- **Derived atoms**: Computed once, cached
- **Lazy evaluation**: Atoms only compute when subscribed

#### Zustand
- **Selector pattern**: Subscribe to specific state slices
- **Shallow equality**: Prevent re-renders on same values
- **Outside React**: Can read without subscribing

Example:
```typescript
// Only re-renders when apiKey changes, not other settings
const apiKey = useStore(state => state.settings.apiKey)
```

#### SWR
- **Request deduplication**: Single request for multiple uses
- **Cache-first**: Instant display from cache
- **Background revalidation**: Update in background
- **Focus revalidation**: Refresh when tab focused

### CSS-in-JS Performance

#### Styletron (Atomic CSS)
- **Minimal CSS**: Each property → one class
- **Deduplication**: Same styles reuse classes
- **Runtime efficiency**: Fast style injection
- **Small output**: Atomic CSS is compact

Benefits:
```css
/* Traditional */
.button-1 { padding: 10px; color: blue; }
.button-2 { padding: 10px; color: red; }

/* Atomic (Styletron) */
.a { padding: 10px; }  /* Reused */
.b { color: blue; }
.c { color: red; }
```

### Caching Strategies

#### Translation Cache
- **LRU Cache** (lru-cache v10.0.1): Recent translations cached
- **IndexedDB**: Persistent cache (Dexie)
- **Memory cache**: Quick access to recent

#### HTTP Cache
- **SWR caching**: API responses cached
- **Stale-while-revalidate**: Show cached, update background
- **Cache invalidation**: Smart cache clearing

### Debouncing & Throttling

**lodash.debounce** (v4.0.8):
- Input fields debounced
- API calls debounced
- Resize/scroll throttled

Example:
```typescript
import debounce from 'lodash.debounce'

const debouncedSearch = debounce((text) => {
    performSearch(text)
}, 300)
```

## Network Performance

### API Optimization

#### Streaming Responses
- **SSE parsing**: eventsource-parser
- **Progressive display**: Show results as they arrive
- **Cancellation**: AbortController for cancelling
- **Backpressure**: Handle fast streams

#### Request Optimization
- **Concurrent requests**: Limited concurrency
- **Retry logic**: Automatic retries on failure
- **Timeout handling**: Prevent hanging requests
- **Connection reuse**: HTTP keep-alive

### Data Transfer

#### Minimal Payloads
- Send only necessary data
- Compress requests (if provider supports)
- Efficient serialization (JSON)

#### Lazy Loading
- Load translations on demand (i18next backend)
- Defer non-critical assets
- Progressive enhancement

## Memory Management

### Cleanup
```typescript
useEffect(() => {
    const subscription = subscribe()

    return () => {
        // Cleanup
        subscription.unsubscribe()
    }
}, [deps])
```

### Avoid Memory Leaks
- Clean up event listeners
- Cancel pending requests on unmount
- Clear timers and intervals
- Dispose heavy objects

### IndexedDB (Dexie)
- **Efficient queries**: Indexed searches
- **Pagination**: Load data in chunks
- **Automatic cleanup**: Old data pruned
- **Transactions**: Batched writes

## Platform-Specific Optimizations

### Tauri Desktop

#### Rust Performance
- **Compiled code**: Native performance
- **Zero-cost abstractions**: Rust efficiency
- **Parallel processing**: Tokio async runtime
- **Memory efficient**: No garbage collection overhead

#### IPC Optimization
- **Batch calls**: Group multiple commands
- **Minimize serialization**: Send minimal data
- **Async commands**: Non-blocking operations

#### Window Management
- **Lazy window creation**: Create windows on demand
- **Window pooling**: Reuse windows when possible
- **Preload**: Preload common resources

### Browser Extension

#### Background Script
- **Event pages** (Firefox): Unload when idle
- **Service worker** (Chromium): Efficient lifecycle
- **Minimal background work**: Offload to content script

#### Content Script
- **Lazy injection**: Only inject when needed
- **Minimal DOM manipulation**: Batch updates
- **Shadow DOM**: Isolated, performant rendering

### Userscript
- **Minimal dependencies**: Small bundle
- **Load asynchronously**: Don't block page load
- **Efficient selectors**: Fast DOM queries

## Rendering Performance

### Virtual DOM
React optimizations:
- Reconciliation algorithm
- Batched updates
- Efficient diffing

### CSS Performance
- **Atomic CSS**: Minimal reflows
- **GPU acceleration**: Transform/opacity for animations
- **Avoid layout thrashing**: Batch DOM reads/writes

### Animation
- **requestAnimationFrame**: Smooth animations
- **CSS transitions**: GPU-accelerated
- **Debounced scroll**: Throttle scroll handlers

## Data Processing

### Text Processing
- **Streaming**: Process text incrementally
- **Workers** (potential): Offload heavy processing
- **Efficient algorithms**: QuoteProcessor optimized

### Token Counting
**js-tiktoken** (v1.0.10):
- Estimate token count before API call
- Prevent over-limit errors
- Cost estimation

### Language Detection
- **Local detection**: whatlang (Rust), fast
- **Browser API**: chrome.i18n.detectLanguage
- **Cache results**: Don't re-detect same text

## Monitoring & Profiling

### Development Tools
- **React DevTools Profiler**: Identify slow renders
- **Chrome DevTools**: Performance timeline
- **Lighthouse**: Overall performance score

### Production Monitoring
- **Sentry**: Error tracking with performance data
- **Analytics**: Track performance metrics
- **User feedback**: Slow operation reports

## Best Practices Implemented

### Lazy Loading
```typescript
const HeavyComponent = lazy(() => import('./HeavyComponent'))

<Suspense fallback={<Loading />}>
    <HeavyComponent />
</Suspense>
```

### Conditional Loading
- Load features only when used
- Progressive feature enablement
- Platform-specific code loading

### Efficient Rendering
- Keys on list items
- Avoid inline function definitions (where possible)
- Stable references (useCallback)

### Resource Hints
```html
<link rel="preconnect" href="https://api.openai.com">
<link rel="dns-prefetch" href="https://api.openai.com">
```

## Performance Budget

Likely targets:
- **Bundle size**: <500KB initial (per platform)
- **First paint**: <1s
- **Time to interactive**: <2s
- **Translation start**: <500ms
- **Streaming latency**: <100ms per chunk

## Future Optimizations

Potential improvements:
- Web Workers for heavy processing
- Wasm for critical algorithms
- Service Worker for offline support
- HTTP/2 for multiplexing
- Preload critical resources
- Edge caching (for shared backend)