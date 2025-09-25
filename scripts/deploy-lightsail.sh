#!/bin/bash

# AWS Resources Manager - Lightsail Deployment Script with Load Balancer
# This script deploys the application to AWS Lightsail with a load balancer

set -e

# Configuration
SERVICE_NAME="aws-resources-service"
LOAD_BALANCER_NAME="aws-resources-lb"
REGION=${AWS_DEFAULT_REGION:-ap-south-1}
AWS_PROFILE=${AWS_PROFILE:-staging}
CONTAINER_NAME="app"
POWER="nano" # nano, micro, small, medium, large, xlarge
SCALE=2      # Number of container instances
DEPLOYMENT_FILE="lightsail-deployment.json"
LB_CONFIG_FILE="lightsail/load-balancer-config.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
  echo -e "${BLUE}[STEP]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
  log_info "Checking prerequisites..."

  # Check AWS CLI
  if ! command -v aws &>/dev/null; then
    log_error "AWS CLI is not installed or not in PATH"
    exit 1
  fi

  # Check AWS credentials and get account info
  log_info "Validating AWS credentials using profile: $AWS_PROFILE"
  if ! CALLER_IDENTITY=$(aws sts get-caller-identity --profile $AWS_PROFILE --region $REGION 2>/dev/null); then
    log_error "AWS credentials not configured or invalid for profile: $AWS_PROFILE"
    log_error "Please run 'aws configure --profile $AWS_PROFILE' or set AWS environment variables"
    exit 1
  fi

  # Display account information
  ACCOUNT_ID=$(echo $CALLER_IDENTITY | jq -r '.Account // "Unknown"')
  USER_ARN=$(echo $CALLER_IDENTITY | jq -r '.Arn // "Unknown"')
  USER_ID=$(echo $CALLER_IDENTITY | jq -r '.UserId // "Unknown"')

  log_info "AWS Account ID: $ACCOUNT_ID"
  log_info "User ARN: $USER_ARN"
  log_info "Profile: $AWS_PROFILE"
  log_info "Region: $REGION"

  # Check if deployment file exists
  if [ ! -f "$DEPLOYMENT_FILE" ]; then
    log_error "Deployment configuration not found: $DEPLOYMENT_FILE"
    exit 1
  fi

  # Check if load balancer config exists
  if [ ! -f "$LB_CONFIG_FILE" ]; then
    log_error "Load balancer configuration not found: $LB_CONFIG_FILE"
    exit 1
  fi

  # Check Docker
  if ! command -v docker &>/dev/null; then
    log_warn "Docker not found. Make sure your image is built and pushed to a registry."
  fi

  log_info "Prerequisites check passed"
}

# Build and push image to Lightsail
build_and_push_image() {
  log_step "Building and pushing Docker image to Lightsail..."

  # Build the image locally
  if command -v docker &>/dev/null; then
    log_info "Building Docker image locally..."
    docker build -t aws-resources:latest .

    # Push to Lightsail container service
    log_info "Pushing image to Lightsail container service..."
    aws lightsail push-container-image \
      --profile $AWS_PROFILE \
      --region $REGION \
      --service-name $SERVICE_NAME \
      --label aws-resources-latest \
      --image aws-resources:latest

    log_info "Image pushed successfully"
  else
    log_warn "Docker not available. Skipping image build."
  fi
}

# Create or update container service
deploy_container_service() {
  log_step "Deploying container service..."

  # Check if service exists
  if aws lightsail get-container-services --profile $AWS_PROFILE --region $REGION --service-name $SERVICE_NAME &>/dev/null; then
    log_info "Container service exists, updating..."

    # Update the service
    aws lightsail create-container-service-deployment \
      --profile $AWS_PROFILE \
      --region $REGION \
      --service-name $SERVICE_NAME \
      --cli-input-json file://$DEPLOYMENT_FILE
  else
    log_info "Creating new container service..."

    # Create the service
    aws lightsail create-container-service \
      --profile $AWS_PROFILE \
      --region $REGION \
      --service-name $SERVICE_NAME \
      --power $POWER \
      --scale $SCALE \
      --tags key=Project,value="AWS Resources Manager" key=Environment,value=production

    log_info "Waiting for container service to be ready..."

    # Wait for service to be ready
    while true; do
      STATUS=$(aws lightsail get-container-service \
        --profile $AWS_PROFILE \
        --region $REGION \
        --service-name $SERVICE_NAME \
        --query 'containerService.state' \
        --output text)

      if [ "$STATUS" = "READY" ]; then
        log_info "Container service is ready"
        break
      elif [ "$STATUS" = "FAILED" ]; then
        log_error "Container service creation failed"
        exit 1
      else
        log_info "Container service status: $STATUS. Waiting..."
        sleep 30
      fi
    done

    # Deploy the containers
    log_info "Deploying containers..."
    aws lightsail create-container-service-deployment \
      --profile $AWS_PROFILE \
      --region $REGION \
      --service-name $SERVICE_NAME \
      --cli-input-json file://$DEPLOYMENT_FILE
  fi

  # Wait for deployment to be active
  log_info "Waiting for deployment to become active..."
  while true; do
    DEPLOYMENT_STATE=$(aws lightsail get-container-service \
      --profile $AWS_PROFILE \
      --region $REGION \
      --service-name $SERVICE_NAME \
      --query 'containerService.currentDeployment.state' \
      --output text)

    if [ "$DEPLOYMENT_STATE" = "ACTIVE" ]; then
      log_info "Deployment is now active"
      break
    elif [ "$DEPLOYMENT_STATE" = "FAILED" ]; then
      log_error "Deployment failed"
      exit 1
    else
      log_info "Deployment state: $DEPLOYMENT_STATE. Waiting..."
      sleep 30
    fi
  done
}

# Create load balancer
create_load_balancer() {
  log_step "Setting up load balancer..."

  # Check if load balancer exists
  if aws lightsail get-load-balancer --profile $AWS_PROFILE --region $REGION --load-balancer-name $LOAD_BALANCER_NAME &>/dev/null; then
    log_info "Load balancer already exists: $LOAD_BALANCER_NAME"
  else
    log_info "Creating load balancer..."

    # Create the load balancer
    aws lightsail create-load-balancer \
      --profile $AWS_PROFILE \
      --region $REGION \
      --load-balancer-name $LOAD_BALANCER_NAME \
      --instance-port 3000 \
      --health-check-path "/" \
      --tags key=Project,value="AWS Resources Manager" key=Environment,value=production

    log_info "Waiting for load balancer to be active..."

    # Wait for load balancer to be active
    while true; do
      LB_STATE=$(aws lightsail get-load-balancer \
        --profile $AWS_PROFILE \
        --region $REGION \
        --load-balancer-name $LOAD_BALANCER_NAME \
        --query 'loadBalancer.state' \
        --output text)

      if [ "$LB_STATE" = "active" ]; then
        log_info "Load balancer is now active"
        break
      elif [ "$LB_STATE" = "failed" ]; then
        log_error "Load balancer creation failed"
        exit 1
      else
        log_info "Load balancer state: $LB_STATE. Waiting..."
        sleep 30
      fi
    done
  fi
}

# Attach container service to load balancer
attach_to_load_balancer() {
  log_step "Attaching container service to load balancer..."

  # Get container service details
  SERVICE_URL=$(aws lightsail get-container-service \
    --profile $AWS_PROFILE \
    --region $REGION \
    --service-name $SERVICE_NAME \
    --query 'containerService.url' \
    --output text)

  if [ "$SERVICE_URL" = "None" ] || [ -z "$SERVICE_URL" ]; then
    log_error "Container service URL not found. Service may not be ready."
    exit 1
  fi

  # Extract the service endpoint name from URL
  SERVICE_ENDPOINT=$(echo $SERVICE_URL | sed 's|https\?://||' | cut -d'.' -f1)

  log_info "Attaching container service endpoint: $SERVICE_ENDPOINT"

  # Attach container service to load balancer
  aws lightsail attach-load-balancer-tls-certificate \
    --profile $AWS_PROFILE \
    --region $REGION \
    --load-balancer-name $LOAD_BALANCER_NAME \
    --certificate-name $LOAD_BALANCER_NAME-cert 2>/dev/null || log_warn "No TLS certificate attached (optional)"

  # Note: Lightsail doesn't have a direct "attach container service to load balancer" command
  # Instead, we need to configure the load balancer to point to the container service
  log_info "Load balancer created. You may need to manually configure it to point to your container service."
  log_info "Container service URL: $SERVICE_URL"
}

# Setup SSL certificate (optional)
setup_ssl_certificate() {
  if [ ! -z "$DOMAIN_NAME" ]; then
    log_step "Setting up SSL certificate for domain: $DOMAIN_NAME"

    # Check if certificate exists
    if aws lightsail get-load-balancer-tls-certificates \
      --profile $AWS_PROFILE \
      --region $REGION \
      --load-balancer-name $LOAD_BALANCER_NAME \
      --query "tlsCertificates[?name=='${LOAD_BALANCER_NAME}-cert']" \
      --output text | grep -q "${LOAD_BALANCER_NAME}-cert"; then
      log_info "SSL certificate already exists"
    else
      log_info "Creating SSL certificate..."

      aws lightsail create-load-balancer-tls-certificate \
        --profile $AWS_PROFILE \
        --region $REGION \
        --load-balancer-name $LOAD_BALANCER_NAME \
        --certificate-name "${LOAD_BALANCER_NAME}-cert" \
        --certificate-domain-name "$DOMAIN_NAME" \
        --certificate-alternative-names "$DOMAIN_NAME" "www.$DOMAIN_NAME"

      log_info "SSL certificate created. You'll need to validate it via DNS."
    fi
  fi
}

# Get deployment information
get_deployment_info() {
  log_step "Getting deployment information..."

  # Get container service info
  SERVICE_INFO=$(aws lightsail get-container-service \
    --profile $AWS_PROFILE \
    --region $REGION \
    --service-name $SERVICE_NAME \
    --output json)

  SERVICE_URL=$(echo $SERVICE_INFO | jq -r '.containerService.url // "Not available"')
  SERVICE_STATE=$(echo $SERVICE_INFO | jq -r '.containerService.state')

  # Get load balancer info
  LB_INFO=$(aws lightsail get-load-balancer \
    --profile $AWS_PROFILE \
    --region $REGION \
    --load-balancer-name $LOAD_BALANCER_NAME \
    --output json 2>/dev/null || echo '{}')

  if [ "$LB_INFO" != '{}' ]; then
    LB_DNS=$(echo $LB_INFO | jq -r '.loadBalancer.dnsName // "Not available"')
    LB_STATE=$(echo $LB_INFO | jq -r '.loadBalancer.state')
  else
    LB_DNS="Not created"
    LB_STATE="Not created"
  fi

  echo
  log_info "=== DEPLOYMENT COMPLETE ==="
  log_info "Container Service: $SERVICE_NAME"
  log_info "Service State: $SERVICE_STATE"
  log_info "Service URL: $SERVICE_URL"
  log_info "Load Balancer: $LOAD_BALANCER_NAME"
  log_info "Load Balancer State: $LB_STATE"
  log_info "Load Balancer DNS: $LB_DNS"
  echo
  log_info "Note: In Lightsail, you'll need to manually configure your load balancer"
  log_info "to distribute traffic to your container service instances."
}

# Main deployment function
main() {
  log_info "Starting AWS Resources Manager Lightsail deployment..."
  log_info "Service Name: $SERVICE_NAME"
  log_info "Load Balancer: $LOAD_BALANCER_NAME"
  log_info "AWS Profile: $AWS_PROFILE"
  log_info "Region: $REGION"
  log_info "Scale: $SCALE instances"
  log_info "Power: $POWER"
  echo

  # Ask for optional domain name
  read -p "Enter domain name for SSL certificate (optional, press enter to skip): " DOMAIN_NAME

  check_prerequisites

  # Ask if user wants to build and push image
  echo
  read -p "Build and push Docker image? (y/n): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    build_and_push_image
  fi

  deploy_container_service
  create_load_balancer

  if [ ! -z "$DOMAIN_NAME" ]; then
    setup_ssl_certificate
  fi

  get_deployment_info

  log_info "Deployment completed successfully!"
  log_warn "Remember to configure your DNS to point to the load balancer if using a custom domain."
}

# Handle script arguments
case "${1:-}" in
"build")
  check_prerequisites
  build_and_push_image
  ;;
"deploy")
  check_prerequisites
  deploy_container_service
  get_deployment_info
  ;;
"lb")
  check_prerequisites
  create_load_balancer
  get_deployment_info
  ;;
"destroy")
  log_warn "This will destroy the container service and load balancer. Are you sure?"
  read -p "Type 'yes' to confirm: " CONFIRM
  if [ "$CONFIRM" = "yes" ]; then
    log_info "Deleting load balancer..."
    aws lightsail delete-load-balancer --profile $AWS_PROFILE --region $REGION --load-balancer-name $LOAD_BALANCER_NAME 2>/dev/null || log_warn "Load balancer not found or already deleted"

    log_info "Deleting container service..."
    aws lightsail delete-container-service --profile $AWS_PROFILE --region $REGION --service-name $SERVICE_NAME 2>/dev/null || log_warn "Container service not found or already deleted"

    log_info "Resources deletion completed!"
  else
    log_info "Destruction cancelled"
  fi
  ;;
*)
  main
  ;;
esac
