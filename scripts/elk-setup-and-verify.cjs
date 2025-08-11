#!/usr/bin/env node

/**
 * ELK Stack Setup and Verification Script
 *
 * This script:
 * 1. Creates ELK stack with docker compose in "force recreate" mode
 * 2. Verifies if mounted volumes (/app/logs/sample:ro and /app/logs/mle-tools:ro) are present in Kibana
 * 3. Verifies if npm test is launched and generates logs visible in Kibana
 */

const { execSync } = require('child_process');
const path = require('path');

// Use dynamic import for axios to handle ES modules
const getAxios = async () => {
    try {
        const axios = await import('axios');
        return axios.default || axios;
    } catch (error) {
        console.error('Failed to import axios. Please run: npm install axios');
        process.exit(1);
    }
};

class ELKSetupVerifier {
    constructor() {
        this.kibanaUrl = 'http://localhost:5601';
        this.elasticsearchUrl = 'http://localhost:9200';
        this.dockerComposeFile = path.join(__dirname, '../src/logger/logstash/docker-compose.yml');
        this.projectRoot = path.join(__dirname, '../');
        this.maxRetries = 30;
        this.retryDelay = 10000; // 10 seconds
        this.axios = null;
    }

    async initialize() {
        this.axios = await getAxios();
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${level}] ${message}`);
    }

    async sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async executeCommand(command, cwd = this.projectRoot, options = {}) {
        this.log(`Executing: ${command}`);
        try {
            const result = execSync(command, {
                cwd,
                encoding: 'utf8',
                stdio: options.silent ? 'pipe' : 'inherit',
                ...options,
            });
            return result;
        } catch (error) {
            this.log(`Command failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async forceRecreateELKStack() {
        this.log('🚀 Starting ELK stack with force recreate...');

        const logstashDir = path.join(__dirname, '../src/logger/logstash');

        try {
            this.log('Stopping existing containers...');
            await this.executeCommand('docker-compose down -v --remove-orphans', logstashDir, {
                silent: true,
            });

            this.log('Force recreating ELK stack...');
            await this.executeCommand('docker-compose up -d --force-recreate', logstashDir);

            this.log('✅ ELK stack created successfully');
        } catch (error) {
            this.log(`❌ Failed to create ELK stack: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async waitForService(url, serviceName, maxRetries = this.maxRetries) {
        this.log(`⏳ Waiting for ${serviceName} to be ready...`);

        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await this.axios.get(url, { timeout: 5000 });
                if (response.status === 200) {
                    this.log(`✅ ${serviceName} is ready`);
                    return true;
                }
            } catch (error) {
                this.log(`Attempt ${i + 1}/${maxRetries}: ${serviceName} not ready yet...`);
                await this.sleep(this.retryDelay);
            }
        }

        throw new Error(
            `${serviceName} did not become ready within ${(maxRetries * this.retryDelay) / 1000} seconds`,
        );
    }

    async verifyMountedVolumes() {
        this.log('🔍 Verifying mounted volumes...');

        try {
            const logstashContainerCheck = await this.executeCommand(
                'docker exec logstash ls -la /app/logs/',
                this.projectRoot,
                { silent: true },
            );

            this.log('Logstash container /app/logs/ contents:');
            console.log(logstashContainerCheck);

            try {
                const sampleVolumeCheck = await this.executeCommand(
                    'docker exec logstash ls -la /app/logs/sample/',
                    this.projectRoot,
                    { silent: true },
                );
                this.log('✅ /app/logs/sample:ro volume is mounted and accessible');
                this.log('Sample volume contents:');
                console.log(sampleVolumeCheck);
            } catch (error) {
                this.log('❌ /app/logs/sample:ro volume is not accessible', 'ERROR');
                throw error;
            }

            try {
                const mleToolsVolumeCheck = await this.executeCommand(
                    'docker exec logstash ls -la /app/logs/mle-tools/ 2>/dev/null || echo "mle-tools directory not found"',
                    this.projectRoot,
                    { silent: true },
                );
                this.log('✅ /app/logs/mle-tools:ro volume is mounted');
                this.log('MLE-tools volume contents:');
                console.log(mleToolsVolumeCheck);
            } catch (error) {
                this.log(
                    '⚠️ /app/logs/mle-tools:ro volume directory not found (this is normal if no logs were generated yet)',
                    'WARN',
                );
            }

            this.log('✅ Volume verification completed');
        } catch (error) {
            this.log(`❌ Volume verification failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async runNpmTestAndVerifyLogs() {
        this.log('🧪 Running npm test to generate logs...');

        try {
            await this.executeCommand('npm run test:logger', this.projectRoot);
            this.log('✅ npm test completed successfully');

            this.log('⏳ Waiting for logs to be processed by Logstash...');
            await this.sleep(15000); // 15 seconds

            await this.verifyLogsInElasticsearch();
        } catch (error) {
            this.log(`❌ npm test failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async verifyLogsInElasticsearch() {
        this.log('🔍 Verifying logs in Elasticsearch...');

        try {
            const indicesResponse = await this.axios.get(`${this.elasticsearchUrl}/_cat/indices?format=json`);
            this.log('Available indices:');
            console.log(JSON.stringify(indicesResponse.data, null, 2));

            const appLogIndices = indicesResponse.data.filter(
                (index) => index.index && index.index.startsWith('app-logs-'),
            );

            if (appLogIndices.length === 0) {
                throw new Error('No app-logs indices found in Elasticsearch');
            }

            this.log(`✅ Found ${appLogIndices.length} app-logs indices`);

            const searchResponse = await this.axios.get(
                `${this.elasticsearchUrl}/app-logs-*/_search?q=*&size=10`,
            );

            const hits = searchResponse.data.hits.hits;
            this.log(`✅ Found ${hits.length} recent log entries`);

            if (hits.length > 0) {
                this.log('Sample log entries:');
                hits.forEach((hit, index) => {
                    const source = hit._source;
                    console.log(`${index + 1}. [${source.level}] ${source.log_message} (service: ${source.service})`);
                });
            }

            this.log('✅ Logs verification completed - logs are visible in Elasticsearch and should be accessible in Kibana');
        } catch (error) {
            this.log(`❌ Logs verification failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async createKibanaIndexPattern() {
        this.log('📊 Creating Kibana index pattern for log visualization...');

        try {
            const indexPatternData = {
                attributes: {
                    title: 'app-logs-*',
                    timeFieldName: '@timestamp',
                },
            };

            await this.axios.post(
                `${this.kibanaUrl}/api/saved_objects/index-pattern/app-logs-pattern`,
                indexPatternData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'kbn-xsrf': 'true',
                    },
                },
            );

            this.log('✅ Kibana index pattern created successfully');
            const kibanaDiscoverUrl = `${this.kibanaUrl}/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(columns:!(level,service,log_message),filters:!(),index:'app-logs-pattern',interval:auto,query:(language:kuery,query:''),sort:!(!('@timestamp',desc)))`;
            this.log(`🌐 You can now view logs at: ${kibanaDiscoverUrl}`);
        } catch (error) {
            if (error.response && error.response.status === 409) {
                this.log('ℹ️ Kibana index pattern already exists');
            } else {
                this.log(`⚠️ Failed to create Kibana index pattern: ${error.message}`, 'WARN');
                this.log('You can manually create the index pattern in Kibana using: app-logs-*', 'WARN');
            }
        }
    }

    async showServiceStatus() {
        this.log('📊 ELK Stack Service Status:');
        try {
            const logstashDir = path.join(__dirname, '../src/logger/logstash');
            const result = await this.executeCommand('docker-compose ps', logstashDir, { silent: true });
            console.log(result);
        } catch (error) {
            this.log(`Failed to get service status: ${error.message}`, 'ERROR');
        }
    }

    async showAccessInstructions() {
        this.log('\n🎉 ELK Stack Setup and Verification Complete!');
        this.log('\n📋 Access Information:');
        this.log(`   • Elasticsearch: ${this.elasticsearchUrl}`);
        this.log(`   • Kibana: ${this.kibanaUrl}`);
        this.log('\n🔍 To view logs in Kibana:');
        this.log('   1. Open Kibana in your browser');
        this.log('   2. Go to "Discover" section');
        this.log('   3. Use index pattern: app-logs-*');
        this.log('   4. Set time range to "Last 15 minutes" to see test logs');
        this.log('\n📊 Log indices contain logs from:');
        this.log('   • /app/logs/sample:ro (sample logs)');
        this.log('   • /app/logs/mle-tools:ro (application logs from npm test)');
    }

    async run() {
        try {
            await this.initialize();
            this.log('🚀 Starting ELK Stack Setup and Verification Process...');

            await this.forceRecreateELKStack();
            await this.waitForService(this.elasticsearchUrl, 'Elasticsearch');
            await this.waitForService(`${this.kibanaUrl}/api/status`, 'Kibana');
            await this.verifyMountedVolumes();
            await this.runNpmTestAndVerifyLogs();
            await this.createKibanaIndexPattern();
            await this.showServiceStatus();
            await this.showAccessInstructions();

            this.log('✅ All verifications completed successfully!');
        } catch (error) {
            this.log(`❌ Setup and verification failed: ${error.message}`, 'ERROR');
            process.exit(1);
        }
    }
}

// Run the script if executed directly
if (require.main === module) {
    const verifier = new ELKSetupVerifier();
    verifier.run().catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
}

module.exports = ELKSetupVerifier;
