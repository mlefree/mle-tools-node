#!/usr/bin/env node

// Test script to reproduce the Logstash issue with Winston daily rotate files
const { LoggerFactory } = require('./dist/logger/LoggerFactory');

async function testLogstashIssue() {
    console.log('Testing Logstash issue with Winston daily rotate...');

    // Get current log files before starting
    const fs = require('fs');
    const path = require('path');
    const logsDir = '.logs';

    console.log('Existing log files before test:');
    try {
        const existingFiles = fs.readdirSync(logsDir);
        existingFiles.forEach(file => console.log(`  - ${file}`));
    } catch (err) {
        console.log('  No .logs directory found yet');
    }

    console.log('\nCreating logger and generating logs...');

    // Create logger instance
    const logger = LoggerFactory.getLogger('TEST-LOGSTASH');

    // Generate some initial logs
    logger.info('Initial log message - should be indexed by Logstash');
    logger.warn('Warning message for testing');
    logger.error('Error message for testing');

    // Wait a bit to ensure file is created
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\nLog files after initial logging:');
    try {
        const filesAfterInitial = fs.readdirSync(logsDir);
        filesAfterInitial.forEach(file => {
            const stats = fs.statSync(path.join(logsDir, file));
            console.log(`  - ${file} (size: ${stats.size} bytes, created: ${stats.birthtime})`);
        });
    } catch (err) {
        console.log('  Error reading logs directory:', err.message);
    }

    // Now force a log rotation by creating many logs in a short time
    // This should trigger Winston daily rotate to create a new file
    console.log('\nGenerating many logs to potentially trigger rotation...');

    for (let i = 0; i < 100; i++) {
        logger.info(`Bulk log message ${i} - testing rotation and Logstash detection`);
        if (i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    // Wait for potential rotation
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\nLog files after bulk logging:');
    try {
        const filesAfterBulk = fs.readdirSync(logsDir);
        filesAfterBulk.forEach(file => {
            const stats = fs.statSync(path.join(logsDir, file));
            console.log(`  - ${file} (size: ${stats.size} bytes, created: ${stats.birthtime})`);
        });
    } catch (err) {
        console.log('  Error reading logs directory:', err.message);
    }

    // Continue logging to potentially create new files
    console.log('\nContinuing to log with timestamps to create time-based rotation...');

    for (let i = 0; i < 20; i++) {
        const timestamp = new Date().toISOString();
        logger.info(`Timestamped log ${i} at ${timestamp} - new file detection test`);
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\nFinal log files:');
    try {
        const finalFiles = fs.readdirSync(logsDir);
        finalFiles.forEach(file => {
            const stats = fs.statSync(path.join(logsDir, file));
            console.log(`  - ${file} (size: ${stats.size} bytes, created: ${stats.birthtime})`);
        });
    } catch (err) {
        console.log('  Error reading logs directory:', err.message);
    }

    console.log('\nTest complete. Check if Logstash indexed all log files, especially any newly created ones.');
    console.log('You can check Elasticsearch at http://localhost:9200/_search?q=*&pretty to see indexed logs.');
}

// Run the test
testLogstashIssue().catch(console.error);
