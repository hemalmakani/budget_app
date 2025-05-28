#!/bin/bash

# Budget Reset Lambda Deployment Script
# This script builds, packages, and optionally deploys the Lambda function

set -e  # Exit on any error

echo "🚀 Starting Lambda deployment process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the lambda directory."
    exit 1
fi

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf dist/
rm -f *.zip

# Install dependencies
print_status "Installing dependencies..."
npm install

# Build TypeScript
print_status "Building TypeScript..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    print_error "Build failed - dist directory not found"
    exit 1
fi

# Create deployment package
print_status "Creating deployment package..."
zip -r budget-reset-lambda.zip dist/ node_modules/ package.json -x "node_modules/typescript/*" "node_modules/@types/*" "*.ts" "tsconfig.json"

# Check if zip was created
if [ ! -f "budget-reset-lambda.zip" ]; then
    print_error "Failed to create deployment package"
    exit 1
fi

# Get zip file size
ZIP_SIZE=$(ls -lh budget-reset-lambda.zip | awk '{print $5}')
print_success "Deployment package created: budget-reset-lambda.zip (${ZIP_SIZE})"

# Check for AWS CLI
if command -v aws &> /dev/null; then
    echo ""
    read -p "Do you want to deploy to AWS now? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Get function name
        read -p "Enter Lambda function name (default: budget-reset-scheduler): " FUNCTION_NAME
        FUNCTION_NAME=${FUNCTION_NAME:-budget-reset-scheduler}
        
        print_status "Deploying to AWS Lambda function: $FUNCTION_NAME"
        
        # Check if function exists
        if aws lambda get-function --function-name "$FUNCTION_NAME" &> /dev/null; then
            print_status "Updating existing function..."
            aws lambda update-function-code \
                --function-name "$FUNCTION_NAME" \
                --zip-file fileb://budget-reset-lambda.zip
            
            print_status "Updating function configuration..."
            aws lambda update-function-configuration \
                --function-name "$FUNCTION_NAME" \
                --handler "dist/index.handler" \
                --runtime "nodejs20.x" \
                --timeout 30
            
            print_success "Function updated successfully!"
        else
            print_warning "Function $FUNCTION_NAME not found."
            print_status "Please create the function in AWS Console first, then run this script again."
        fi
    else
        print_status "Skipping AWS deployment."
    fi
else
    print_warning "AWS CLI not found. Please install it to enable automatic deployment."
fi

echo ""
print_success "🎉 Lambda function is ready for deployment!"
print_status "Next steps:"
echo "1. Upload budget-reset-lambda.zip to AWS Lambda Console"
echo "2. Set handler to: dist/index.handler"
echo "3. Set runtime to: Node.js 20.x"
echo "4. Configure environment variables (DATABASE_URL)"
echo "5. Set up EventBridge trigger for scheduling"
echo ""
print_status "For detailed instructions, see README.md" 