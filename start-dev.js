#!/usr/bin/env node

// Simple development startup script that bypasses Electron Forge CLI issues
const { spawn } = require('child_process')
const path = require('path')

console.log('🚀 Starting PJAIS Development Environment')
console.log('==========================================')

// Check if built files exist
const fs = require('fs')
const mainBuiltPath = '.vite/build/main.js'
const rendererBuiltPath = '.vite/build/index.html'

if (!fs.existsSync(mainBuiltPath)) {
  console.log('❌ Main process not built. Please run build first.')
  console.log('💡 Try: npm run build or manual build process')
  process.exit(1)
}

console.log('✅ Built files found')
console.log('🔄 Starting Electron with Vite dev server...')

// Start Vite dev server for renderer
console.log('🔄 Starting Vite dev server for renderer...')
const viteProcess = spawn('npx', ['vite', '--config', 'vite.renderer.config.ts'], {
  stdio: 'pipe',
  cwd: process.cwd()
})

let viteReady = false

viteProcess.stdout.on('data', (data) => {
  const output = data.toString()
  console.log(`[VITE] ${output.trim()}`)
  
  if (output.includes('Local:') && !viteReady) {
    viteReady = true
    console.log('✅ Vite dev server ready')
    
    // Start Electron after a short delay
    setTimeout(() => {
      console.log('🔄 Starting Electron main process...')
      
      const electronProcess = spawn('npx', ['electron', '.'], {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'development'
        }
      })
      
      electronProcess.on('close', (code) => {
        console.log(`\n📊 Electron process exited with code ${code}`)
        viteProcess.kill()
        process.exit(code)
      })
      
      electronProcess.on('error', (error) => {
        console.error('💥 Electron process error:', error)
        viteProcess.kill()
        process.exit(1)
      })
      
    }, 2000)
  }
})

viteProcess.stderr.on('data', (data) => {
  const output = data.toString()
  console.error(`[VITE ERROR] ${output.trim()}`)
})

viteProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`💥 Vite process exited with code ${code}`)
    process.exit(code)
  }
})

viteProcess.on('error', (error) => {
  console.error('💥 Vite process error:', error)
  process.exit(1)
})

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Shutting down development environment...')
  viteProcess.kill()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🔄 Shutting down development environment...')
  viteProcess.kill()
  process.exit(0)
})