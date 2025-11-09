#!/usr/bin/env node

/**
 * Hello World CLI Entry Point
 *
 * A simple command-line interface for running the Hello World application.
 * This file serves as the executable entry point as per REQ-2.
 */

import { main } from './hello-world'

// Execute the main function
try {
    main()
    process.exit(0)
} catch (error) {
    console.error('Error executing Hello World:', error)
    process.exit(1)
}
