import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

async function globalSetup() {
  console.log('🔧 Setting up Electron e2e tests...');
  
  // Check if build exists
  const buildPath = path.join(__dirname, '..', '.vite', 'build', 'main.js');
  
  if (!existsSync(buildPath)) {
    console.log('📦 Building Electron app for e2e tests...');
    console.log('Note: Building for tests. This may take a moment...');
    
    try {
      // Use npm start to build the app (electron-forge start builds to .vite/build)
      // We'll run it with a timeout and kill it after build completes
      const buildProcess = execSync('npm run package', { 
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe',
        timeout: 180000, // 3 minutes timeout
        encoding: 'utf8'
      });
      
      console.log('✅ Electron app built successfully');
    } catch (error: any) {
      // Check if the build directory was created despite the error
      if (existsSync(buildPath)) {
        console.log('✅ Electron app build found after build process');
      } else {
        console.error('❌ Failed to build Electron app:', error.message);
        console.log('💡 Trying alternative approach - checking for existing build...');
        
        // Try to find any existing build
        const altBuildPath = path.join(__dirname, '..', 'out');
        if (existsSync(altBuildPath)) {
          console.log('✅ Found alternative build directory');
        } else {
          throw new Error(`Build failed and no build directory found at ${buildPath}`);
        }
      }
    }
  } else {
    console.log('✅ Electron app build found');
  }
  
  // Verify the build file exists
  if (existsSync(buildPath)) {
    console.log(`✅ Build file verified at: ${buildPath}`);
  } else {
    console.warn(`⚠️  Warning: Build file not found at expected location: ${buildPath}`);
  }
  
  console.log('🚀 Ready to run e2e tests');
}

export default globalSetup; 