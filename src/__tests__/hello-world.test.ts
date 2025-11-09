import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { getHelloWorld, printHelloWorld, main } from '../hello-world'

/**
 * Test Suite: Hello World Application
 *
 * Validates all requirements from the PRD including:
 * - REQ-1: Output Display
 * - REQ-2: Execution Model
 * - REQ-3: Clear Output
 * - NFR-2: Performance
 * - User Stories: First Execution, Code Understanding
 */

describe('Hello World - Core Functionality', () => {
    describe('Scenario 1: Basic Output Display (REQ-1)', () => {
        /**
         * Test Case 1.1: Function returns correct greeting
         * Validates that getHelloWorld() returns exactly "Hello World"
         */
        it('should return "Hello World" string', () => {
            const result = getHelloWorld()
            expect(result).toBe('Hello World')
            expect(result).toHaveLength(11)
            expect(typeof result).toBe('string')
        })

        /**
         * Test Case 1.2: Consistent output
         * Validates that multiple calls return the same result
         */
        it('should return consistent result on multiple calls', () => {
            const result1 = getHelloWorld()
            const result2 = getHelloWorld()
            expect(result1).toBe(result2)
        })

        /**
         * Test Case 1.3: No leading or trailing whitespace
         * Validates clean output without unexpected spaces
         */
        it('should not have leading or trailing whitespace', () => {
            const result = getHelloWorld()
            expect(result.trim()).toBe(result)
            expect(result).not.toMatch(/^\s|\s$/)
        })
    })

    describe('Scenario 2: Console Output (REQ-1 + REQ-3)', () => {
        let consoleLogSpy: ReturnType<typeof vi.spyOn>
        let consoleErrorSpy: ReturnType<typeof vi.spyOn>
        let consoleWarnSpy: ReturnType<typeof vi.spyOn>

        beforeEach(() => {
            consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
            consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
            consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        })

        afterEach(() => {
            consoleLogSpy.mockRestore()
            consoleErrorSpy.mockRestore()
            consoleWarnSpy.mockRestore()
        })

        /**
         * Test Case 2.1: Console output is produced
         * Validates that printHelloWorld() actually outputs to console
         */
        it('should output to console when printHelloWorld is called', () => {
            printHelloWorld()
            expect(consoleLogSpy).toHaveBeenCalled()
            expect(consoleLogSpy).toHaveBeenCalledWith('Hello World')
        })

        /**
         * Test Case 2.2: No error messages (REQ-3)
         * Validates clean execution without errors or warnings
         */
        it('should not produce error or warning messages', () => {
            printHelloWorld()
            expect(consoleErrorSpy).not.toHaveBeenCalled()
            expect(consoleWarnSpy).not.toHaveBeenCalled()
        })

        /**
         * Test Case 2.3: Single line output
         * Validates output is on a single line
         */
        it('should output exactly one line', () => {
            printHelloWorld()
            expect(consoleLogSpy).toHaveBeenCalledTimes(1)
        })
    })

    describe('Scenario 3: Execution Model (REQ-2)', () => {
        let consoleLogSpy: ReturnType<typeof vi.spyOn>

        beforeEach(() => {
            consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
        })

        afterEach(() => {
            consoleLogSpy.mockRestore()
        })

        /**
         * Test Case 3.1: Main function executes successfully
         * Validates the main entry point works without throwing
         */
        it('should execute main function without errors', () => {
            expect(() => main()).not.toThrow()
        })

        /**
         * Test Case 3.2: Main function produces output
         * Validates main() results in console output
         */
        it('should produce output when main is called', () => {
            main()
            expect(consoleLogSpy).toHaveBeenCalledWith('Hello World')
        })

        /**
         * Test Case 3.3: Idempotent execution
         * Validates multiple executions work correctly
         */
        it('should support multiple executions', () => {
            main()
            main()
            expect(consoleLogSpy).toHaveBeenCalledTimes(2)
        })
    })

    describe('Scenario 4: Performance (NFR-2)', () => {
        /**
         * Test Case 4.1: Fast execution of getHelloWorld
         * Validates function executes within performance budget (< 1ms for simple string return)
         */
        it('should execute getHelloWorld in under 1ms', () => {
            const start = performance.now()
            getHelloWorld()
            const end = performance.now()
            const duration = end - start
            expect(duration).toBeLessThan(1)
        })

        /**
         * Test Case 4.2: Fast execution of printHelloWorld
         * Validates printing executes quickly (< 10ms)
         */
        it('should execute printHelloWorld in under 10ms', () => {
            const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

            const start = performance.now()
            printHelloWorld()
            const end = performance.now()
            const duration = end - start

            consoleLogSpy.mockRestore()
            expect(duration).toBeLessThan(10)
        })

        /**
         * Test Case 4.3: Overall application performance
         * Validates complete execution is under 1 second (as per NFR-2)
         */
        it('should complete main execution in under 1 second', () => {
            const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

            const start = performance.now()
            main()
            const end = performance.now()
            const duration = end - start

            consoleLogSpy.mockRestore()
            expect(duration).toBeLessThan(1000)
        })
    })

    describe('Scenario 5: Code Simplicity (NFR-1, User Story 2)', () => {
        /**
         * Test Case 5.1: Function signature is simple
         * Validates that getHelloWorld has no parameters
         */
        it('should have zero-parameter function signature for getHelloWorld', () => {
            expect(getHelloWorld.length).toBe(0)
        })

        /**
         * Test Case 5.2: Return type validation
         * Validates function returns string type
         */
        it('should return string type from getHelloWorld', () => {
            const result = getHelloWorld()
            expect(typeof result).toBe('string')
        })

        /**
         * Test Case 5.3: No side effects in pure function
         * Validates getHelloWorld is a pure function
         */
        it('should not have side effects in getHelloWorld', () => {
            const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

            getHelloWorld()

            expect(consoleLogSpy).not.toHaveBeenCalled()
            expect(consoleErrorSpy).not.toHaveBeenCalled()

            consoleLogSpy.mockRestore()
            consoleErrorSpy.mockRestore()
        })
    })

    describe('Scenario 6: Edge Cases and Error Handling', () => {
        /**
         * Test Case 6.1: Functions are defined
         * Validates all exported functions exist
         */
        it('should export all required functions', () => {
            expect(getHelloWorld).toBeDefined()
            expect(printHelloWorld).toBeDefined()
            expect(main).toBeDefined()
        })

        /**
         * Test Case 6.2: Functions are callable
         * Validates functions are of type function
         */
        it('should export functions of correct type', () => {
            expect(typeof getHelloWorld).toBe('function')
            expect(typeof printHelloWorld).toBe('function')
            expect(typeof main).toBe('function')
        })

        /**
         * Test Case 6.3: No unexpected behavior
         * Validates functions don't modify global state unexpectedly
         */
        it('should not pollute global scope', () => {
            const globalKeys = Object.keys(globalThis)
            getHelloWorld()
            printHelloWorld()
            const globalKeysAfter = Object.keys(globalThis)

            // Allow for test framework artifacts, but no new app-specific globals
            expect(globalKeysAfter.length).toBeLessThanOrEqual(globalKeys.length + 2)
        })
    })
})

describe('Hello World - Integration Tests', () => {
    /**
     * Integration Test 1: Complete workflow
     * Validates the entire hello world workflow from start to finish
     */
    it('should execute complete hello world workflow', () => {
        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

        // Step 1: Get the message
        const message = getHelloWorld()
        expect(message).toBe('Hello World')

        // Step 2: Print the message
        printHelloWorld()
        expect(consoleLogSpy).toHaveBeenCalledWith('Hello World')

        // Step 3: Execute main
        main()
        expect(consoleLogSpy).toHaveBeenCalledWith('Hello World')

        consoleLogSpy.mockRestore()
    })

    /**
     * Integration Test 2: First-time user experience (User Story 1)
     * Simulates a new developer running the application
     */
    it('should provide successful first execution experience', () => {
        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        let exitCode = 0
        try {
            main()
        } catch (error) {
            exitCode = 1
        }

        expect(exitCode).toBe(0)
        expect(consoleLogSpy).toHaveBeenCalledWith('Hello World')
        expect(consoleErrorSpy).not.toHaveBeenCalled()

        consoleLogSpy.mockRestore()
        consoleErrorSpy.mockRestore()
    })

    /**
     * Integration Test 3: DevOps validation (User Story 3)
     * Validates execution for deployment pipeline validation
     */
    it('should complete successfully for deployment validation', () => {
        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
        const start = performance.now()

        let success = false
        try {
            main()
            success = true
        } catch (error) {
            success = false
        }

        const end = performance.now()
        const duration = end - start

        expect(success).toBe(true)
        expect(duration).toBeLessThan(1000)
        expect(consoleLogSpy).toHaveBeenCalledWith('Hello World')

        consoleLogSpy.mockRestore()
    })
})
