#!/bin/bash
set -e

# Configuration
ECR_REGISTRY="418295703256.dkr.ecr.ap-south-1.amazonaws.com"
IMAGE_NAME="aws-resources"
SERVICE_NAME="aws-resources-service"
PROFILE="staging"
REGION="ap-south-1"

echo "🏗️  Building Docker image..."
# Ensure .env.production exists
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production file not found! Please create it with your production environment variables."
    exit 1
fi

docker build -t ${IMAGE_NAME}:latest .

echo "🏷️  Tagging image for ECR..."
docker tag ${IMAGE_NAME}:latest ${ECR_REGISTRY}/${IMAGE_NAME}:latest

echo "🔐 Logging in to ECR..."
aws ecr get-login-password --region ${REGION} --profile ${PROFILE} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

echo "📤 Pushing image to ECR..."
docker push ${ECR_REGISTRY}/${IMAGE_NAME}:latest

echo "🚀 Deploying to Lightsail..."
aws lightsail create-container-service-deployment \
    --service-name ${SERVICE_NAME} \
    --cli-input-json file://lightsail-deployment.json \
    --profile ${PROFILE} \
    --region ${REGION}

echo "✅ Deployment initiated! Check Lightsail console for status."