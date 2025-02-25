# QR Code Testing Guide

This guide provides instructions for setting up QR code testing on your local development environment.

## Setting Up for QR Code Testing

To properly test the QR code sync functionality, you need to ensure your mobile device can access your local development server. Follow these steps:

### Step 1: Configure Your Firewall (Windows Users)

Windows users need to open the firewall port to allow connections to the Next.js development server:

1. Run the firewall helper script:
   ```
   npm run firewall
   ```

2. Follow the prompts to create the necessary firewall rules.

3. If the script fails, you can manually open port 3001 in Windows Firewall:
   - Open Windows Defender Firewall with Advanced Security
   - Select "Inbound Rules" and click "New Rule..."
   - Select "Port" and click "Next"
   - Select "TCP" and enter "3001" as the port, then click "Next"
   - Select "Allow the connection" and click "Next"
   - Select all profiles (Domain, Private, Public) and click "Next"
   - Name it "Next.js Development Server" and click "Finish"
   - Repeat for "Outbound Rules"

### Step 2: Start the Next.js App

Start your Next.js app with the remote flag to make it accessible from other devices:

```
npm run dev:remote
```

> This uses the `-H 0.0.0.0` flag to make your app accessible from other devices on the same network.

### Step 3: Configure the App URL

#### Method 1: Using the App URL Helper (Recommended)

1. Run the URL helper script:
   ```
   npm run app-url
   ```
   
2. When prompted, enter one of the following:
   - Your local network IP (e.g., `192.168.1.100:3001`)
   - A tunnel URL (e.g., from ngrok or localtunnel)

3. The script will update your `.env.local` file with the properly formatted URL.

4. Restart your Next.js app to apply the changes.

#### Method 2: Using a Tunnel Service

##### Using ngrok (if installed):

1. In a new terminal, run:
   ```
   npm run ngrok
   ```

2. The script will automatically update your `.env.local` file with the ngrok URL.

3. Restart your Next.js app to apply the changes.

##### Using localtunnel:

1. Install localtunnel globally:
   ```
   npm install -g localtunnel
   ```

2. In a new terminal, run:
   ```
   npx lt --port 3001 --subdomain handfont-dev
   ```

3. Update your `.env.local` file manually with:
   ```
   NEXT_PUBLIC_APP_URL=https://handfont-dev.loca.lt
   ```

4. Restart your Next.js app to apply the changes.

#### Method 3: Using Your Local Network

1. Find your local IP address:
   - On Windows: Run `ipconfig` in Command Prompt
   - On Mac: Go to System Preferences > Network
   - On Linux: Run `ip addr show` or `ifconfig`

2. Run the URL helper script:
   ```
   npm run app-url
   ```

3. Enter your local IP with the port (e.g., `192.168.1.100:3001`).

4. Restart your Next.js app to apply the changes.

5. Make sure your mobile device is connected to the same WiFi network.

## Troubleshooting

### Connection Issues

1. **Firewall Blocking Connection**: Make sure you've configured your firewall using the `npm run firewall` command.

2. **Wrong URL Format**: Ensure your URL has the correct protocol (http:// or https://).

3. **Missing Host Flag**: When running `next dev`, make sure to use the `-H 0.0.0.0` flag to expose your server (use `npm run dev:remote`).

4. **Network Isolation**: Some WiFi networks isolate devices. Try using a mobile hotspot instead.

### QR Code Issues

1. **QR Code Not Scanning**: Make sure the QR code is clearly visible and well-lit.

2. **Invalid Session Error**: The session may have expired. Generate a new QR code.

3. **Redirects to /fonts Page**: Check that the URL in your QR code is correct and has the proper session code.

## Need More Help?

If you're still having issues, check the Next.js documentation for network-related configuration or consult the project maintainers. 