#!/bin/bash

# FinTrack Setup Script
# This script helps you get started with FinTrack

set -e

echo "🚀 FinTrack Setup Assistant"
echo "==========================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Backend setup
echo "📦 Setting up backend..."
cd backend

if [ ! -f ".env" ]; then
    echo "⚠️  Creating .env file from example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created backend/.env - Please edit with your credentials"
    else
        echo "❌ .env.example not found"
        exit 1
    fi
else
    echo "✅ backend/.env already exists"
fi

echo "📥 Installing backend dependencies..."
npm install
echo "✅ Backend dependencies installed"
echo ""

# Frontend setup
echo "📦 Setting up frontend..."
cd ../web

if [ ! -f ".env.local" ]; then
    echo "⚠️  Creating .env.local file from example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        echo "✅ Created web/.env.local - Please edit with your credentials"
    else
        echo "❌ .env.example not found"
        exit 1
    fi
else
    echo "✅ web/.env.local already exists"
fi

echo "📥 Installing frontend dependencies..."
npm install
echo "✅ Frontend dependencies installed"
echo ""

cd ..

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with your credentials"
echo "2. Edit web/.env.local with your Supabase keys"
echo "3. Create the database table (see docs/SUPABASE_SCHEMA.sql)"
echo "4. Start backend: cd backend && npm start"
echo "5. Start frontend: cd web && npm run dev"
echo ""
echo "📚 For detailed setup instructions, see SETUP.md"
echo "🚀 For deployment guide, see docs/DEPLOYMENT.md"
echo ""
echo "Happy tracking! 💰"

