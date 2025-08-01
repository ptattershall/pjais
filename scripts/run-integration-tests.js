#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

// Ensure test results directory exists
const testResultsDir = path.join(__dirname, '..', 'test-results');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

// Test configurations
const testConfigs = [
  {
    name: 'Unit Tests',
    command: 'npm',
    args: ['run', 'test:main'],
    color: 'green'
  },
  {
    name: 'Integration Tests',
    command: 'npx',
    args: ['vitest', 'run', '--config', 'vitest.integration.config.ts'],
    color: 'blue'
  },
  {
    name: 'E2E Tests',
    command: 'npx',
    args: ['playwright', 'test', '--config', 'playwright.e2e.config.ts'],
    color: 'yellow'
  }
];

async function runTest(config) {
  return new Promise((resolve, reject) => {
    log(`\n${colors.bold}Running ${config.name}...${colors.reset}`, config.color);
    
    const child = spawn(config.command, config.args, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        log(`✅ ${config.name} passed`, 'green');
        resolve();
      } else {
        log(`❌ ${config.name} failed (exit code: ${code})`, 'red');
        reject(new Error(`${config.name} failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      log(`❌ ${config.name} error: ${error.message}`, 'red');
      reject(error);
    });
  });
}

async function runAllTests() {
  log(`${colors.bold}Starting Test Suite...${colors.reset}`, 'blue');
  
  const results = {
    passed: [],
    failed: []
  };

  for (const config of testConfigs) {
    try {
      await runTest(config);
      results.passed.push(config.name);
    } catch (error) {
      results.failed.push({
        name: config.name,
        error: error.message
      });
      
      // Continue running other tests even if one fails
      if (process.env.FAIL_FAST === 'true') {
        break;
      }
    }
  }

  // Summary
  log(`\n${colors.bold}Test Results Summary:${colors.reset}`, 'blue');
  log(`✅ Passed: ${results.passed.length}`, 'green');
  log(`❌ Failed: ${results.failed.length}`, 'red');
  
  if (results.passed.length > 0) {
    log(`\nPassed tests:`, 'green');
    results.passed.forEach(test => log(`  - ${test}`, 'green'));
  }
  
  if (results.failed.length > 0) {
    log(`\nFailed tests:`, 'red');
    results.failed.forEach(test => log(`  - ${test.name}: ${test.error}`, 'red'));
  }

  // Write summary to file
  const summaryFile = path.join(testResultsDir, 'test-summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    results,
    total: testConfigs.length,
    passed: results.passed.length,
    failed: results.failed.length
  }, null, 2));

  log(`\nTest summary written to: ${summaryFile}`, 'blue');
  
  // Exit with appropriate code
  if (results.failed.length > 0) {
    process.exit(1);
  } else {
    log(`\n🎉 All tests passed!`, 'green');
    process.exit(0);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const runSpecific = args.find(arg => arg.startsWith('--run='));

if (runSpecific) {
  const testName = runSpecific.split('=')[1];
  const config = testConfigs.find(c => c.name.toLowerCase().includes(testName.toLowerCase()));
  
  if (config) {
    runTest(config)
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    log(`❌ Unknown test: ${testName}`, 'red');
    log(`Available tests: ${testConfigs.map(c => c.name).join(', ')}`, 'yellow');
    process.exit(1);
  }
} else {
  runAllTests().catch(console.error);
}