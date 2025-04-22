#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Paths to the package files
const packageJsonPath = path.resolve(__dirname, '../package.json');
const packageMLEJsonPath = path.resolve(__dirname, '../package.mle.json');

// Read the package files
const packageJson = require(packageJsonPath);
const packageMLEJson = require(packageMLEJsonPath);

// Command line argument to determine mode
const mode = process.argv[2];

if (!mode || (mode !== 'local' && mode !== 'remote')) {
    console.error('Please specify a mode: "local" or "remote"');
    console.log('Usage: node switch-dependencies.js local|remote');
    process.exit(1);
}

// Get the dependencies for the specified mode
const dependencies = mode === 'local'
    ? packageMLEJson['local.dependencies']
    : packageMLEJson['remote.dependencies'];

// Update the dependencies in package.json
let updated = false;
for (const [name, version] of Object.entries(dependencies)) {
    if (!packageJson.dependencies[name] || packageJson.dependencies[name] !== version) {
        packageJson.dependencies[name] = version;
        updated = true;
        console.log(`Updated ${name} to ${version}`);
    }
}

if (!updated) {
    console.log(`Dependencies are already in ${mode} mode.`);
} else {
    // Write the updated package.json back to disk
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`Successfully switched to ${mode} dependencies mode.`);
}
