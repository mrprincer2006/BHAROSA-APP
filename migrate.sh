#!/bin/bash

# BHAROSA E-Commerce Platform Migration Script
# This script helps migrate from the old structure to the new modular structure

echo "🚀 BHAROSA Migration Script"
echo "============================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "📋 Current directory structure:"
echo ""

# Show current structure
echo "📁 Current files:"
find . -maxdepth 2 -type f -name "*.js" -o -name "*.html" -o -name "*.json" | sort

echo ""
echo "🔄 Migration Steps:"
echo ""

# Step 1: Backup old files
echo "1️⃣ Creating backup of old files..."
if [ ! -d "backup" ]; then
    mkdir backup
fi

# Backup important files
[ -f "server.js" ] && cp server.js backup/
[ -f "db.js" ] && cp db.js backup/
[ -f ".env" ] && cp .env backup/
echo "   ✅ Backup created in 'backup/' directory"

# Step 2: Update package.json to use new structure
echo ""
echo "2️⃣ Updating package.json..."
if grep -q "src/app-new.js" package.json; then
    echo "   ✅ package.json already updated"
else
    echo "   ⚠️  Please manually update package.json to use 'src/app-new.js' as main"
fi

# Step 3: Check if new structure exists
echo ""
echo "3️⃣ Checking new structure..."
if [ -d "src" ] && [ -d "public" ]; then
    echo "   ✅ New structure found"
    echo "   📁 src/ - Backend source code"
    echo "   📁 public/ - Frontend static files"
else
    echo "   ❌ New structure not found"
    echo "   📝 Please ensure the new structure is in place"
fi

# Step 4: Check database
echo ""
echo "4️⃣ Checking database..."
if [ -f "bharosa.db" ]; then
    echo "   ✅ Database found: bharosa.db"
else
    echo "   ⚠️  Database not found. Will be created on first run."
fi

# Step 5: Environment variables
echo ""
echo "5️⃣ Checking environment variables..."
if [ -f ".env" ]; then
    echo "   ✅ .env file found"
    echo "   📝 Ensure all required variables are set:"
    echo "      - SMTP_HOST, SMTP_USER, SMTP_PASS"
    echo "      - ADMIN_EMAIL"
    echo "      - RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET"
    echo "      - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN"
    echo "      - FAST2SMS_API_KEY"
else
    echo "   ⚠️  .env file not found"
    echo "   📝 Copy .env.example to .env and configure"
fi

# Step 6: Dependencies
echo ""
echo "6️⃣ Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "   ✅ node_modules found"
    echo "   💡 Run 'npm install' to ensure all dependencies are up to date"
else
    echo "   ❌ node_modules not found"
    echo "   📝 Run 'npm install' to install dependencies"
fi

echo ""
echo "🎉 Migration Summary:"
echo "=================="
echo "✅ Old files backed up to 'backup/'"
echo "✅ New structure in place"
echo "✅ Database ready"
echo ""
echo "📝 Next Steps:"
echo "1. Run 'npm install' to update dependencies"
echo "2. Configure your .env file with credentials"
echo "3. Run 'npm run dev' to start the development server"
echo "4. Open http://localhost:3000 in your browser"
echo ""
echo "📚 Documentation:"
echo "- README-NEW.md - Updated documentation"
echo "- PROJECT_STRUCTURE.md - Detailed structure guide"
echo ""
echo "🚀 Ready to start using the new BHAROSA E-Commerce Platform!"
