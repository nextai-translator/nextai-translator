/**
 * Test scaffolding for Tauri v2 upgrade - Configuration Schema Migration
 * Scenario: 10 (Configuration Schema)
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

describe('Configuration Schema Migration - Scenario 10', () => {
  const projectRoot = join(__dirname, '..', '..')
  const tauriConfigPath = join(projectRoot, 'src-tauri', 'tauri.conf.json')

  /**
   * Test Case 10.1: tauri.conf.json validation
   * Expected: Configuration file should be valid
   */
  it('should have valid tauri.conf.json', () => {
    expect(existsSync(tauriConfigPath)).toBe(true)

    const configContent = readFileSync(tauriConfigPath, 'utf-8')
    const config = JSON.parse(configContent)

    // Should have required top-level keys
    expect(config).toHaveProperty('productName')
    expect(config).toHaveProperty('version')
    expect(config).toHaveProperty('identifier')
    expect(config).toHaveProperty('build')
    expect(config).toHaveProperty('bundle')
    expect(config).toHaveProperty('app')
  })

  /**
   * Test Case 10.1: Schema validation against stable v2
   * Expected: No beta-specific schema elements
   */
  it('should use stable v2 schema reference', () => {
    const configContent = readFileSync(tauriConfigPath, 'utf-8')
    const config = JSON.parse(configContent)

    // Schema should reference stable CLI, not beta
    if (config.$schema) {
      expect(config.$schema).not.toContain('beta')
      // Should point to @tauri-apps/cli/schema.json
      expect(config.$schema).toContain('@tauri-apps/cli')
    }
  })

  /**
   * Test Case 10.2: File system plugin scope configuration
   * Expected: FS scope should be valid and properly configured
   */
  it('should have valid fs plugin scope configuration', () => {
    const configContent = readFileSync(tauriConfigPath, 'utf-8')
    const config = JSON.parse(configContent)

    // Check plugins.fs configuration
    expect(config.plugins).toBeDefined()
    expect(config.plugins.fs).toBeDefined()
    expect(config.plugins.fs.scope).toBeDefined()
    expect(config.plugins.fs.scope.allow).toBeInstanceOf(Array)
    expect(config.plugins.fs.scope.allow.length).toBeGreaterThan(0)
  })

  /**
   * Test Case 10.3: Shell plugin configuration
   * Expected: Shell configuration should be valid
   */
  it('should have valid shell plugin configuration', () => {
    const configContent = readFileSync(tauriConfigPath, 'utf-8')
    const config = JSON.parse(configContent)

    expect(config.plugins.shell).toBeDefined()
    // Shell open should be configured
    expect(config.plugins.shell).toHaveProperty('open')
  })

  /**
   * Test Case 10.4: Updater plugin configuration
   * Expected: Updater settings should be valid
   */
  it('should have valid updater plugin configuration', () => {
    const configContent = readFileSync(tauriConfigPath, 'utf-8')
    const config = JSON.parse(configContent)

    expect(config.plugins.updater).toBeDefined()
    expect(config.plugins.updater.active).toBe(true)
    expect(config.plugins.updater.endpoints).toBeInstanceOf(Array)
    expect(config.plugins.updater.endpoints.length).toBeGreaterThan(0)
    expect(config.plugins.updater.pubkey).toBeDefined()
    expect(typeof config.plugins.updater.pubkey).toBe('string')
  })

  /**
   * Test Case 10.5: Bundle configuration
   * Expected: Bundle targets should be valid for stable v2
   */
  it('should have valid bundle configuration', () => {
    const configContent = readFileSync(tauriConfigPath, 'utf-8')
    const config = JSON.parse(configContent)

    expect(config.bundle).toBeDefined()
    expect(config.bundle.active).toBe(true)
    expect(config.bundle.targets).toBeInstanceOf(Array)

    // Should include expected targets
    const targets = config.bundle.targets
    expect(targets).toContain('app') // macOS
    expect(targets).toContain('dmg') // macOS
    expect(targets).toContain('nsis') // Windows
    expect(targets).toContain('deb') // Linux
    expect(targets).toContain('appimage') // Linux

    // Linux-specific configuration
    expect(config.bundle.linux).toBeDefined()
    expect(config.bundle.linux.deb).toBeDefined()
    expect(config.bundle.linux.deb.depends).toContain('xdotool')
  })

  /**
   * Test Case 10.6: Security configuration (CSP, asset protocol)
   * Expected: Security settings should be properly configured
   */
  it('should have valid security configuration', () => {
    const configContent = readFileSync(tauriConfigPath, 'utf-8')
    const config = JSON.parse(configContent)

    expect(config.app).toBeDefined()
    expect(config.app.security).toBeDefined()

    // Asset protocol should be enabled with scope
    expect(config.app.security.assetProtocol).toBeDefined()
    expect(config.app.security.assetProtocol.enable).toBe(true)
    expect(config.app.security.assetProtocol.scope).toBeDefined()
    expect(config.app.security.assetProtocol.scope.allow).toBeInstanceOf(Array)
  })

  /**
   * Test Case 10.7: Tray icon configuration
   * Expected: Tray icon should be configured correctly
   */
  it('should have valid tray icon configuration', () => {
    const configContent = readFileSync(tauriConfigPath, 'utf-8')
    const config = JSON.parse(configContent)

    expect(config.app.trayIcon).toBeDefined()
    expect(config.app.trayIcon.id).toBe('tray')
    expect(config.app.trayIcon.iconPath).toBeDefined()
    expect(typeof config.app.trayIcon.iconPath).toBe('string')
  })

  /**
   * Test: No deprecated configuration options present
   * Expected: Configuration should not use deprecated options
   */
  it('should not contain deprecated configuration options', () => {
    const configContent = readFileSync(tauriConfigPath, 'utf-8')

    // Check for common deprecated options (examples - adjust based on actual deprecations)
    // These are placeholders for actual deprecated options in stable v2
    expect(configContent).not.toContain('allowlist') // Example deprecated option
    expect(configContent).not.toContain('tauri-specta') // Should not be in config
  })

  /**
   * Test: Build configuration is valid
   * Expected: Build settings should work with stable v2 CLI
   */
  it('should have valid build configuration', () => {
    const configContent = readFileSync(tauriConfigPath, 'utf-8')
    const config = JSON.parse(configContent)

    expect(config.build).toBeDefined()
    expect(config.build.beforeDevCommand).toBeDefined()
    expect(config.build.devUrl).toBeDefined()
    expect(config.build.frontendDist).toBeDefined()

    // Dev command should use pnpm
    expect(config.build.beforeDevCommand).toContain('pnpm')
  })
})
