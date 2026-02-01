#!/bin/bash
# Netlify Build Hook für Node.js 22 Support

echo "🔧 Starting build with Node.js 22 support..."
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Verify crypto.hash is available
node -e "console.log('crypto.hash available:', typeof crypto.hash === 'function')" || echo "⚠️  crypto.hash not available"

# Run the build
npm run build
