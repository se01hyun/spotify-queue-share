const fs = require('fs');
const path = require('path');

// Environment variables configuration
const envConfig = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ikhqonotdjhstxnrcvld.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlraHFvbm90ZGpoc3R4bnJjdmxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MTk4MjcsImV4cCI6MjA3NDE5NTgyN30.oCJpEWG8Bupv1gF-Qd3DPOT2zeXQUV_AqaT3KoJBG1E
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlraHFvbm90ZGpoc3R4bnJjdmxkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYxOTgyNywiZXhwIjoyMDc0MTk1ODI3fQ.example_service_role_key_placeholder

# Spotify Configuration (Create your app at: https://developer.spotify.com/dashboard)
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here

# NextAuth Configuration
NEXTAUTH_SECRET=yONWs+RpPHpWwg87gHOmSSPxX9pxtJ8U2TVqGYya6PI=
NEXTAUTH_URL=http://localhost:3000

# Instructions:
# 1. Create a Spotify app at: https://developer.spotify.com/dashboard/applications
# 2. Set redirect URI to: http://localhost:3000/api/auth/callback/spotify
# 3. Replace SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET with your actual values
# 4. Get the actual SUPABASE_SERVICE_ROLE_KEY from Supabase dashboard if needed
`;

const envPath = path.join(__dirname, '.env.local');

try {
  fs.writeFileSync(envPath, envConfig);
  console.log('✅ .env.local file created successfully!');
  console.log('📝 Next steps:');
  console.log('1. Go to https://developer.spotify.com/dashboard/applications');
  console.log('2. Create a new app or use existing one');
  console.log('3. Set redirect URI to: http://localhost:3000/api/auth/callback/spotify');
  console.log('4. Copy Client ID and Client Secret to .env.local');
  console.log('5. Restart the development server: npm run dev');
} catch (error) {
  console.error('❌ Error creating .env.local:', error.message);
  console.log('📋 Environment variables to set manually:');
  console.log(envConfig);
}
