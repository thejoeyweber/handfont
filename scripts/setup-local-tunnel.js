#!/usr/bin/env node

/**
 * This script helps set up a local tunnel for testing QR codes
 * It uses ngrok to expose your local server to the internet
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const ngrokPath = require.resolve('ngrok/bin/ngrok');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Setting up local tunnel for QR code testing...');

// Check if ngrok is installed
try {
  execSync('ngrok --version', { stdio: 'ignore' });
  console.log('✅ ngrok is installed');
} catch (error) {
  console.log('❌ ngrok is not installed');
  console.log('Please install ngrok:');
  console.log('  npm install -g ngrok');
  console.log('  or download from https://ngrok.com/download');
  process.exit(1);
}

// Get the port number
rl.question('Enter the port number your Next.js app is running on (default: 3000): ', (port) => {
  port = port || '3000';
  
  console.log(`\n🔄 Starting ngrok tunnel to port ${port}...`);
  console.log('This will create a public URL that you can use to test QR codes.');
  console.log('Press Ctrl+C to stop the tunnel.\n');
  
  try {
    // Start ngrok
    const ngrokProcess = require('child_process').spawn(ngrokPath, ['http', port]);
    
    // Listen for ngrok output
    ngrokProcess.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    
    ngrokProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.log(output);
      
      // Extract the ngrok URL
      const match = output.match(/Forwarding\s+([^\s]+)\s+->/);
      if (match && match[1]) {
        const ngrokUrl = match[1];
        console.log(`\n✅ Tunnel created! Your public URL is: ${ngrokUrl}`);
        console.log('\nAdd this to your .env.local file:');
        console.log(`NEXT_PUBLIC_APP_URL=${ngrokUrl}`);
        
        // Update .env.local file
        rl.question('\nDo you want to update your .env.local file automatically? (y/n): ', (answer) => {
          if (answer.toLowerCase() === 'y') {
            try {
              const envPath = path.join(process.cwd(), '.env.local');
              let envContent = '';
              
              // Read existing .env.local file if it exists
              if (fs.existsSync(envPath)) {
                envContent = fs.readFileSync(envPath, 'utf8');
                
                // Replace or add NEXT_PUBLIC_APP_URL
                if (envContent.includes('NEXT_PUBLIC_APP_URL=')) {
                  envContent = envContent.replace(
                    /NEXT_PUBLIC_APP_URL=.*/,
                    `NEXT_PUBLIC_APP_URL=${ngrokUrl}`
                  );
                } else {
                  envContent += `\nNEXT_PUBLIC_APP_URL=${ngrokUrl}\n`;
                }
              } else {
                envContent = `NEXT_PUBLIC_APP_URL=${ngrokUrl}\n`;
              }
              
              // Write to .env.local
              fs.writeFileSync(envPath, envContent);
              console.log('✅ .env.local file updated successfully!');
              console.log('🔄 Restart your Next.js app to apply the changes.');
            } catch (error) {
              console.error('❌ Error updating .env.local file:', error.message);
            }
          }
          
          console.log('\n🔄 Tunnel is running. Press Ctrl+C to stop.');
        });
      }
    });
    
    // Handle process exit
    ngrokProcess.on('close', (code) => {
      console.log(`\n🛑 ngrok process exited with code ${code}`);
      rl.close();
    });
  } catch (error) {
    console.error('❌ Error starting ngrok:', error.message);
    rl.close();
  }
}); 