# AWS Resources Manager - Lightsail Deployment with Load Balancer

This guide covers deploying the AWS Resources Manager application to AWS Lightsail with an Application Load Balancer for high availability and scalability.

## Prerequisites

- AWS CLI installed and configured
- Docker installed (optional, for local builds)
- AWS account with Lightsail access
- Sufficient permissions for Lightsail operations

## Quick Start

1. **Configure AWS credentials for staging profile:**
   ```bash
   aws configure --profile staging
   ```

   Or set environment variables:
   ```bash
   export AWS_PROFILE=staging
   export AWS_DEFAULT_REGION=ap-south-1
   ```

2. **Make the deployment script executable:**
   ```bash
   chmod +x scripts/deploy-lightsail.sh
   ```

3. **Deploy the application with load balancer:**
   ```bash
   ./scripts/deploy-lightsail.sh
   ```

   The script will:
   - Check prerequisites
   - Ask if you want to build and push the Docker image
   - Create/update the container service
   - Create the load balancer
   - Set up SSL certificate (if domain provided)

## Configuration Files

### Container Service Configuration
- **File:** `lightsail-deployment.json`
- **Purpose:** Defines container service deployment settings
- **Contains:** Container image, ports, environment variables, health checks

### Load Balancer Configuration
- **File:** `lightsail/load-balancer-config.json`
- **Purpose:** Load balancer settings and metadata
- **Contains:** Load balancer name, ports, health check settings

## Deployment Options

### Full Deployment with Load Balancer (Recommended)
```bash
./scripts/deploy-lightsail.sh
```
Deploys both container service and load balancer.

### Build and Push Image Only
```bash
./scripts/deploy-lightsail.sh build
```
Only builds and pushes the Docker image to Lightsail.

### Deploy Container Service Only
```bash
./scripts/deploy-lightsail.sh deploy
```
Deploys only the container service without load balancer.

### Create Load Balancer Only
```bash
./scripts/deploy-lightsail.sh lb
```
Creates only the load balancer.

### Destroy Resources
```bash
./scripts/deploy-lightsail.sh destroy
```
Removes both container service and load balancer.

### Option 2: Using Lightsail Instance with Docker

1. **Create a Lightsail instance:**
   - OS: Ubuntu 22.04 LTS
   - Size: At least 1 GB RAM (2 GB recommended)
   - Enable SSH access

2. **Connect to your instance and install Docker:**
   ```bash
   sudo apt update
   sudo apt install -y docker.io docker-compose
   sudo systemctl start docker
   sudo systemctl enable docker
   sudo usermod -aG docker $USER
   ```

3. **Clone your repository:**
   ```bash
   git clone <your-repo-url>
   cd aws-resources
   ```

4. **Set up environment variables:**
   ```bash
   # Copy and edit your environment file
   cp .env.example .env.local
   nano .env.local
   ```

5. **Deploy with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

## Environment Configuration

Make sure to set the following environment variables:

### Required Variables
- `DATABASE_URL` - Database connection string
- `NEXTAUTH_SECRET` - NextAuth.js secret
- `NEXTAUTH_URL` - Your application URL

### AWS Credentials (if needed)
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

## Database Setup

Your application uses SQLite by default. For production, consider:

1. **Using Amazon RDS** for better reliability
2. **Regular backups** of your SQLite database
3. **Persistent storage** for container deployments

## Monitoring and Maintenance

1. **Health Checks:** Lightsail provides built-in health monitoring
2. **Logs:** Access container logs through AWS console or CLI:
   ```bash
   aws lightsail get-container-log \
     --service-name aws-resources-app \
     --container-name app
   ```
3. **Updates:** To update your application:
   - Build new image locally
   - Push to Lightsail
   - Create new deployment

## Scaling

To scale your application:
```bash
aws lightsail update-container-service \
  --service-name aws-resources-app \
  --scale 2
```

## Troubleshooting

- **Container fails to start:** Check environment variables and image build
- **Database connection issues:** Verify DATABASE_URL and file permissions
- **Port conflicts:** Ensure port 3000 is available and properly mapped

## Cost Optimization

- Use the smallest instance size that meets your needs
- Monitor usage with CloudWatch
- Consider stopping instances during low-usage periods

For more details, refer to the [AWS Lightsail Container Service documentation](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-container-services.html).