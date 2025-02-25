#!/usr/bin/env node

/**
 * This script helps update the NEXT_PUBLIC_APP_URL in .env.local
 * to ensure it has the correct protocol prefix and format for QR code generation.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Path to .env.local file
const envFilePath = path.join(process.cwd(), '.env.local');

// Function to read the .env.local file
function readEnvFile() {
  try {
    if (fs.existsSync(envFilePath)) {
      return fs.readFileSync(envFilePath, 'utf8');
    }
    return '';
  } catch (error) {
    console.error('Error reading .env.local file:', error.message);
    return '';
  }
}

// Function to write to the .env.local file
function writeEnvFile(content) {
  try {
    fs.writeFileSync(envFilePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing to .env.local file:', error.message);
    return false;
  }
}

// Function to parse and update environment variables
function updateEnvVars(content, key, value) {
  const lines = content.split('\n');
  let found = false;
  
  const updatedLines = lines.map(line => {
    if (line.startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  
  if (!found) {
    updatedLines.push(`${key}=${value}`);
  }
  
  return updatedLines.join('\n');
}

// Function to ensure URL has correct format
function formatUrl(url) {
  // Add protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`;
  }
  
  // Remove trailing slash
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  
  return url;
}

// Main function
async function main() {
  console.log('=== Update App URL for QR Code Generation ===');
  console.log('This script will help you set the correct URL for QR code generation.');

  // Ask for the URL
  rl.question('\nEnter your app URL (e.g., localhost:3001, ngrok URL, or IP address): ', (url) => {
    if (!url) {
      console.log('No URL provided. Exiting...');
      rl.close();
      return;
    }

    // Format the URL
    const formattedUrl = formatUrl(url);
    console.log(`\nFormatted URL: ${formattedUrl}`);

    // Read the .env.local file
    const envContent = readEnvFile();
    
    // Update the NEXT_PUBLIC_APP_URL variable
    const updatedContent = updateEnvVars(envContent, 'NEXT_PUBLIC_APP_URL', formattedUrl);
    
    // Write the updated content back to the file
    if (writeEnvFile(updatedContent)) {
      console.log('\nSuccessfully updated NEXT_PUBLIC_APP_URL in .env.local');
      console.log('\n⚠️ Important: You must restart your Next.js app for changes to take effect.');
    } else {
      console.log('\nFailed to update .env.local file.');
    }
    
    rl.close();
  });
}

// Run the main function
main().catch(console.error); 