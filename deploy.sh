#!/bin/bash

# SmartMail Deployment Script for Render.com
# Run this after making changes to deploy updates

echo "🚀 SmartMail Deployment Helper"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this from the project root directory"
    exit 1
fi

# Show current git status
echo "📊 Current Git Status:"
git status --short
echo ""

# Ask for commit message
read -p "Enter commit message: " commit_msg

if [ -z "$commit_msg" ]; then
    echo "❌ Commit message required"
    exit 1
fi

# Stage all changes
echo "📦 Staging changes..."
git add .

# Commit
echo "💾 Committing changes..."
git commit -m "$commit_msg"

# Push to GitHub (triggers auto-deploy)
echo "🚀 Pushing to GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo ""
    echo "⏳ Deployment Status:"
    echo "   Render will automatically deploy in ~2-3 minutes"
    echo ""
    echo "📍 Check deployment status at:"
    echo "   https://dashboard.render.com/"
    echo ""
    echo "🌐 Your app will be live at:"
    echo "   Frontend: https://smartmail-frontend.onrender.com"
    echo "   Backend: https://smartmail-backend.onrender.com"
else
    echo "❌ Push failed. Check error messages above."
    exit 1
fi
