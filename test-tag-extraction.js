#!/usr/bin/env node

// Test script to verify tag extraction functionality
const { LoggerFactory } = require('./dist/logger/LoggerFactory');

async function testTagExtraction() {
    console.log('Testing tag extraction functionality...');

    // Create logger instance
    const loggerFactory = new LoggerFactory();
    const logger = loggerFactory.getLogger('TAG-TEST');

    console.log('\nGenerating log messages with various tag patterns...');

    // Test different tag patterns
    logger.info('(PERF) - Performance test starting');
    logger.warn('(ERROR) - Something went wrong');
    logger.info('Start (DEBUG) processing data');
    logger.error('(CRITICAL) - System failure detected');
    logger.info('Multiple (TASK1) and (TASK2) tags in message');
    logger.debug('(AUTH) - User authentication successful');
    logger.warn('(CACHE) - Cache miss detected');
    logger.info('Normal log message without tags');
    logger.error('(DB_ERROR) - Database connection failed');
    logger.info('(API_CALL) - External API request completed');

    console.log('\nLog messages generated with various tag patterns:');
    console.log('- (PERF) - should be extracted');
    console.log('- (ERROR) - should be extracted');
    console.log('- (DEBUG) - should be extracted');
    console.log('- (CRITICAL) - should be extracted');
    console.log('- (TASK1) and (TASK2) - both should be extracted');
    console.log('- (AUTH) - should be extracted');
    console.log('- (CACHE) - should be extracted');
    console.log('- (DB_ERROR) - should be extracted');
    console.log('- (API_CALL) - should be extracted');

    // Wait a bit for logs to be written
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\nCheck the latest log files:');
    const fs = require('fs');
    const path = require('path');
    const logsDir = '.logs';

    try {
        const logFiles = fs.readdirSync(logsDir)
            .filter(file => file.endsWith('.log'))
            .sort((a, b) => {
                const aStats = fs.statSync(path.join(logsDir, a));
                const bStats = fs.statSync(path.join(logsDir, b));
                return bStats.mtime - aStats.mtime;
            });

        if (logFiles.length > 0) {
            const latestLogFile = logFiles[0];
            console.log(`Latest log file: ${latestLogFile}`);

            const logContent = fs.readFileSync(path.join(logsDir, latestLogFile), 'utf8');
            const lines = logContent.split('\n').filter(line => line.includes('TAG-TEST'));

            console.log('\nLog entries with TAG-TEST:');
            lines.forEach(line => {
                if (line.trim()) {
                    console.log(`  ${line}`);
                }
            });
        }
    } catch (err) {
        console.log('Error reading log files:', err.message);
    }

    console.log('\nWith the updated Logstash configuration, these tags should now be extracted:');
    console.log('- Pattern changed from / \\(([A-Z][A-Z0-9_-]*)\\) / to /(?:^|\\s)\\(([A-Z][A-Z0-9_-]*)\\)/');
    console.log('- This allows matching tags at the beginning of messages or after whitespace');
    console.log('- No longer requires a trailing space after the closing parenthesis');

    console.log('\nRestart Logstash and check Elasticsearch for extracted tags.');
    console.log('Query: http://localhost:9200/app-logs/_search?q=TAG-TEST&pretty');
}

// Run the test
testTagExtraction().catch(console.error);
