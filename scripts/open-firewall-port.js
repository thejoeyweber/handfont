#!/usr/bin/env node

/**
 * This script helps open Windows Firewall port for the Next.js development server
 * to allow mobile devices to connect for QR code testing.
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Check if running on Windows
const isWindows = process.platform === 'win32';

if (!isWindows) {
  console.error('This script is designed for Windows only. On other operating systems, please configure your firewall manually.');
  process.exit(1);
}

/**
 * Executes PowerShell commands as Administrator
 */
function runPowerShellAsAdmin(command) {
  const fullCommand = `powershell -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -Command \\"${command}\\"'"`;
  
  try {
    execSync(fullCommand, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error('Error executing command:', error.message);
    return false;
  }
}

/**
 * Creates firewall rules for Next.js dev server
 */
function createFirewallRules(port) {
  console.log(`\nOpening firewall port ${port} for Next.js development server...`);
  
  // Create the inbound rule command
  const firewallCommand = `
    # Check if rules already exist
    $inboundExists = Get-NetFirewallRule -DisplayName "Next.js Development Server (Inbound)" -ErrorAction SilentlyContinue
    $outboundExists = Get-NetFirewallRule -DisplayName "Next.js Development Server (Outbound)" -ErrorAction SilentlyContinue
    
    # Remove existing rules if they exist
    if ($inboundExists) {
      Remove-NetFirewallRule -DisplayName "Next.js Development Server (Inbound)"
    }
    if ($outboundExists) {
      Remove-NetFirewallRule -DisplayName "Next.js Development Server (Outbound)"
    }
    
    # Create new rules
    New-NetFirewallRule -DisplayName "Next.js Development Server (Inbound)" -Direction Inbound -LocalPort ${port} -Protocol TCP -Action Allow
    New-NetFirewallRule -DisplayName "Next.js Development Server (Outbound)" -Direction Outbound -LocalPort ${port} -Protocol TCP -Action Allow
    
    Write-Host "Firewall rules for port ${port} have been created successfully." -ForegroundColor Green
  `;
  
  // Run the command as admin
  return runPowerShellAsAdmin(firewallCommand);
}

// Main function
async function main() {
  console.log('=== Windows Firewall Configuration for QR Code Testing ===');
  console.log('\nThis script will create Windows Firewall rules to allow connections to your Next.js dev server.');
  console.log('\n⚠️ IMPORTANT: This script needs to run with administrator privileges.');
  console.log('You may see a UAC prompt requesting permission to run PowerShell with admin rights.');
  
  rl.question('\nEnter the port number your Next.js app is running on (default: 3001): ', (portInput) => {
    const port = portInput.trim() || '3001';
    
    console.log(`\nYou entered port: ${port}`);
    rl.question('Do you want to proceed with creating firewall rules? (y/N): ', (answer) => {
      if (answer.toLowerCase() === 'y') {
        const success = createFirewallRules(port);
        
        if (success) {
          console.log('\n✅ Firewall configuration completed successfully!');
          console.log('\nNext steps:');
          console.log('1. Start your Next.js app with: npm run dev:remote');
          console.log('2. Run the app-url helper: npm run app-url');
          console.log('3. Use your local IP address with the port to test QR codes');
        } else {
          console.log('\n❌ Failed to configure firewall. Please try running the script as Administrator or configure the firewall manually.');
        }
      } else {
        console.log('\nOperation cancelled. No changes were made to your firewall configuration.');
      }
      
      rl.close();
    });
  });
}

// Run the main function
main().catch(console.error); 