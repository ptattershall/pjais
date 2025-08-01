async function globalTeardown() {
  console.log('🧹 Cleaning up after e2e tests...');
  
  // Add any cleanup logic here if needed
  // For example, removing test data, killing processes, etc.
  
  console.log('✅ E2e test cleanup complete');
}

export default globalTeardown; 