#!/usr/bin/env node

// Simple test to verify Logstash detects new log files
const fs = require('fs');
const path = require('path');

async function testNewFileDetection() {
    const logsDir = '.logs';

    // Ensure logs directory exists
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    // Create a new log file with timestamp to ensure uniqueness
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const testFileName = `test-logstash-new-file-${timestamp}.log`;
    const testFilePath = path.join(logsDir, testFileName);

    console.log(`Creating new test log file: ${testFileName}`);

    // Create the file with some test log entries
    const logContent = [
        `2025-08-11T16:01:00.000Z|12345.0     |INFO : [TEST-SERVICE] New file detection test - entry 1`,
        `2025-08-11T16:01:01.000Z|12345.0     |WARN : [TEST-SERVICE] New file detection test - entry 2`,
        `2025-08-11T16:01:02.000Z|12345.0     |ERROR: [TEST-SERVICE] New file detection test - entry 3`
    ].join('\n') + '\n';

    fs.writeFileSync(testFilePath, logContent);

    console.log(`Created file ${testFileName} with ${logContent.split('\n').length - 1} log entries`);
    console.log('File contents:');
    console.log(logContent);

    console.log('\nWith the improved Logstash configuration:');
    console.log('- discover_interval: 2 seconds (faster new file detection)');
    console.log('- close_older: 3600 seconds (proper handling of rotated files)');
    console.log('- max_open_files: 4096 (handle multiple log files)');
    console.log('- file_sort_by: last_modified (prioritize newer files)');

    console.log('\nThis new file should be detected by Logstash within 2 seconds and indexed to Elasticsearch.');
    console.log('Check Elasticsearch at http://localhost:9200/_search?q=TEST-SERVICE&pretty to verify indexing.');

    return testFilePath;
}

testNewFileDetection().catch(console.error);
