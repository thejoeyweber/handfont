const ngrok = require('ngrok');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

async function startTunnel() {
  try {
    console.log('Starting ngrok tunnel...');
    
    // Load environment variables
    dotenv.config({ path: '.env.local' });
    
    // Connect to ngrok
    const url = await ngrok.connect({
      addr: 3001,
      onStatusChange: status => {
        console.log(`Ngrok Status: ${status}`);
      }
    });
    
    console.log(`\n✅ Tunnel created! Your public URL is: ${url}`);
    
    // Update .env.local file
    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      
      if (envContent.includes('NEXT_PUBLIC_APP_URL=')) {
        envContent = envContent.replace(
          /NEXT_PUBLIC_APP_URL=.*/,
          `NEXT_PUBLIC_APP_URL=${url}`
        );
      } else {
        envContent += `\nNEXT_PUBLIC_APP_URL=${url}\n`;
      }
    } else {
      envContent = `NEXT_PUBLIC_APP_URL=${url}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env.local file updated successfully!');
    console.log('🔄 Restart your Next.js app to apply the changes.');
    
    console.log('\nPress Ctrl+C to stop the tunnel.');
  } catch (error) {
    console.error('Error starting ngrok:', error);
  }
}

startTunnel();
