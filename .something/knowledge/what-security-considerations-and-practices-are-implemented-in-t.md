# UUID
3d66b453-e939-4af9-8cfe-00720590d5fc

# Trigger
What security considerations and practices are implemented in this project?

# Content
## Security Considerations

The project handles sensitive data (API keys) and operates in various security contexts.

## API Key Management

### Storage Security

#### Browser Extension
- **chrome.storage.sync**: Encrypted by browser
- Never stored in localStorage (more vulnerable)
- Synced securely across devices
- Per-user isolation

#### Tauri Desktop
- Tauri secure storage
- OS keychain integration (potential)
- File system with restricted permissions
- Encrypted at rest

### API Key Usage
- **Never logged**: API keys should not appear in console
- **HTTPS only**: All API requests over secure connections
- **No client-side exposure**: Keys not in frontend bundle
- **Environment variables**: Development keys separate

## Cross-Origin Security

### Browser Extension
**Permissions**: Careful permission management
- Only request necessary permissions
- `<all_urls>` for content script injection
- Host permissions for API endpoints

**Content Security Policy (CSP)**:
- Manifest V3: Stricter CSP
- No inline scripts in extension
- No eval() or Function()
- All scripts from extension bundle

**Background Script CORS Bypass**:
- Background script can make cross-origin requests
- Content script cannot (CORS restricted)
- Proxy pattern: Content → Background → API

### CORS Handling
```typescript
// Content script sends to background
chrome.runtime.sendMessage({ type: 'api_request', ... })

// Background makes actual request (bypasses CORS)
fetch(apiUrl, { ... })
```

## Injection Security (Content Script)

### XSS Prevention
- **React automatic escaping**: React escapes by default
- **Sanitize user input**: Before displaying
- **No dangerouslySetInnerHTML**: Avoid unless necessary
- **CSP compliant**: Follow page CSP where possible

### DOM Isolation
Likely uses Shadow DOM:
- Isolates extension UI from page
- Prevents CSS conflicts
- Prevents JavaScript interference
- Scoped styles and scripts

### Text Selection Safety
- Validate selected text length
- Limit processing size
- Sanitize before sending to API
- Don't execute selected content as code

## Data Privacy

### Minimal Data Collection
- Disable statistics collection option (`disableCollectingStatistics`)
- No unnecessary tracking
- Local-first architecture

### API Request Privacy
- User data sent to chosen LLM provider
- Proxy configuration support (for privacy)
- No middle-man server (direct API calls)

### Local Storage
- Translation history (optional)
- Vocabulary stored locally (Dexie)
- Settings on device only

## Authentication

### Provider Authentication
Different providers use different auth:
- **API Key**: OpenAI, Gemini, etc.
- **Access Token**: Kimi, ChatGLM (OAuth-style)
- **Token Refresh**: Some providers refresh tokens

### Token Refresh Security
```typescript
// Access token + refresh token pattern
{
    kimiAccessToken: string,
    kimiRefreshToken: string,
}
```
- Refresh tokens stored securely
- Auto-refresh before expiration
- Secure token exchange

## Network Security

### HTTPS Only
All API requests:
```typescript
const API_URL = 'https://api.openai.com'  // Never http://
```

### Proxy Support
Secure proxy configuration:
```typescript
proxy: {
    enabled: boolean,
    protocol: 'HTTP' | 'HTTPS',  // Prefer HTTPS
    server: string,
    port: string,
    basicAuth?: {
        username: string,
        password: string,  // Stored securely
    },
    noProxy: string,  // Bypass for certain domains
}
```

### Certificate Validation
- Trust system certificates
- Validate TLS certificates
- No self-signed certificates in production

## Input Validation

### API Settings
- Validate API URLs (format, protocol)
- Sanitize API keys (remove whitespace)
- Validate model names
- Check numeric inputs (rate, volume, etc.)

### Text Input
- Length limits (prevent DoS)
- Character validation
- Encoding checks
- No arbitrary code execution

## Error Handling

### Secure Error Messages
- Don't expose API keys in errors
- Generic user-facing errors
- Detailed logs only in development
- Sanitize error messages from APIs

### Example:
```typescript
try {
    // API call
} catch (error) {
    // Don't log full error with potentially sensitive data
    console.error('API request failed:', error.message)
    // User sees: "Request failed. Please check settings."
}
```

## Dependency Security

### Package Management
- **pnpm**: More secure than npm (content-addressable store)
- **Lock file**: `pnpm-lock.yaml` ensures consistent installs
- **Audit**: Regular `pnpm audit` checks

### Known Vulnerabilities
- Monitor security advisories
- Update dependencies regularly
- Review CVEs for used packages

## Tauri Security

### Rust Safety
- Memory-safe language
- No buffer overflows
- Thread safety
- Compiler enforces safety

### IPC Security
- **Command Whitelist**: Only registered commands callable
- **Validation**: Validate all parameters from frontend
- **Type Safety**: Rust types prevent injection

### Window Security
- **Content Security Policy**: Restrict what frontend can do
- **No arbitrary navigation**: Prevent navigation to malicious sites
- **Secure origins**: Only load trusted content

### Permissions (Tauri)
```json
{
  "tauri": {
    "allowlist": {
      "all": false,  // Deny all by default
      "fs": { "scope": ["$APP/*"] },  // Limit filesystem access
    }
  }
}
```

## Browser Extension Security

### Manifest Permissions
Minimal permissions:
```json
{
  "permissions": [
    "storage",      // Settings only
    "activeTab"     // Current tab only
  ],
  "host_permissions": [
    "https://api.openai.com/*"  // Specific APIs only
  ]
}
```

### No Remote Code
- All code in extension bundle
- No dynamic script loading
- No CDN dependencies in production

### Isolated World
Content script runs in isolated world:
- Cannot access page variables directly
- Page cannot access extension variables
- Message passing for communication

## Best Practices (Implemented)

### Code Security
- **TypeScript**: Type safety prevents many bugs
- **ESLint**: Catch security issues
- **No eval()**: Avoided throughout codebase
- **Strict mode**: TypeScript strict mode enabled

### API Security
- **Rate limiting**: Respect API rate limits
- **Timeout**: Set request timeouts
- **Abort signals**: Cancel requests when needed
- **Error handling**: Graceful degradation

### Update Security
- **Auto-updates**: Tauri updater plugin
- **Signed releases**: Code signing (production)
- **Secure update channel**: HTTPS only

## Threat Model

### Threats Mitigated
1. **API Key Theft**: Secure storage, no logging
2. **XSS Attacks**: React escaping, CSP
3. **MITM Attacks**: HTTPS only
4. **Code Injection**: No eval, input validation
5. **Data Leaks**: Minimal data collection

### Remaining Risks
1. **Provider Trust**: User must trust chosen LLM provider
2. **Clipboard Access**: Desktop app can read clipboard
3. **Screenshot Access**: OCR feature captures screen
4. **Text Selection**: Extension reads selected text

### User Responsibility
- Protect API keys
- Choose trusted LLM providers
- Review permissions before install
- Keep software updated

## Security Audit Recommendations

### Regular Reviews
- Dependency audits: `pnpm audit`
- Code security scans
- Penetration testing
- Third-party security review

### Monitoring
- Error tracking (Sentry) - don't log sensitive data
- Crash reports - sanitize
- Update analytics - privacy-preserving

## Compliance

### GDPR Considerations
- User data stays local (mostly)
- Clear privacy policy needed
- User consent for analytics
- Data export/deletion options

### Security Disclosure
- Responsible disclosure policy
- Security email contact
- Timely patching of vulnerabilities