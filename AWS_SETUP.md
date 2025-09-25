# AWS Setup Guide

This document explains how to configure AWS credentials for the AWS Resource Manager application.

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed (optional, but recommended)

## Configuration Options

The application supports multiple ways to configure AWS credentials:

### Option 1: Environment Variables (Quick Setup)

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Then edit `.env` and set:

```bash
# AWS Configuration
AWS_REGION="us-east-1"
AWS_PROFILE="default"

# Direct credentials (not recommended for production)
AWS_ACCESS_KEY_ID="your-access-key-id"
AWS_SECRET_ACCESS_KEY="your-secret-access-key"
# AWS_SESSION_TOKEN="your-session-token"  # Only needed for temporary credentials
```

### Option 2: AWS Credentials File (Recommended)

1. Set up AWS credentials file:
   ```bash
   mkdir -p ~/.aws
   ```

2. Create `~/.aws/credentials`:
   ```ini
   [default]
   aws_access_key_id = YOUR_ACCESS_KEY_ID
   aws_secret_access_key = YOUR_SECRET_ACCESS_KEY

   [staging]
   aws_access_key_id = YOUR_STAGING_ACCESS_KEY_ID
   aws_secret_access_key = YOUR_STAGING_SECRET_ACCESS_KEY

   [production]
   role_arn = arn:aws:iam::123456789012:role/YourProdRole
   source_profile = default
   ```

3. Create `~/.aws/config`:
   ```ini
   [default]
   region = us-east-1
   output = json

   [profile staging]
   region = us-east-1
   output = json

   [profile production]
   region = us-east-1
   output = json
   ```

4. Set environment variables in `.env`:
   ```bash
   AWS_REGION="us-east-1"
   AWS_PROFILE="staging"  # or "default", "production"
   ```

### Option 3: Custom Credentials File Location

If you want to use the included `aws-config` directory:

```bash
# In .env file
AWS_REGION="us-east-1"
AWS_PROFILE="staging"
AWS_SHARED_CREDENTIALS_FILE="./aws-config/credentials"
AWS_CONFIG_FILE="./aws-config/config"
```

Then edit the files in the `aws-config` directory with your credentials.

### Option 4: Role-Based Access (Production)

For production environments using role assumption:

```bash
# In .env file
AWS_REGION="us-east-1"
AWS_ROLE_ARN="arn:aws:iam::123456789012:role/YourRoleName"
AWS_ROLE_SESSION_NAME="aws-resource-collector"

# Base credentials to assume the role
AWS_ACCESS_KEY_ID="your-base-access-key-id"
AWS_SECRET_ACCESS_KEY="your-base-secret-access-key"
```

## Required AWS Permissions

The application needs the following AWS permissions to collect resources:

### EC2 Collector
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeVpcs",
        "ec2:DescribeSubnets",
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeVolumes"
      ],
      "Resource": "*"
    }
  ]
}
```

### S3 Collector
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListAllMyBuckets",
        "s3:GetBucketLocation",
        "s3:GetBucketTagging",
        "s3:GetBucketVersioning",
        "s3:GetBucketEncryption",
        "s3:GetBucketPolicyStatus",
        "s3:GetBucketAcl",
        "s3:GetBucketLifecycleConfiguration",
        "s3:GetBucketReplication"
      ],
      "Resource": "*"
    }
  ]
}
```

### RDS Collector
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rds:DescribeDBInstances",
        "rds:DescribeDBClusters",
        "rds:ListTagsForResource"
      ],
      "Resource": "*"
    }
  ]
}
```

### Lambda Collector
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:ListFunctions",
        "lambda:GetFunction",
        "lambda:ListTags",
        "lambda:GetPolicy",
        "lambda:ListAliases"
      ],
      "Resource": "*"
    }
  ]
}
```

### STS (Required for all collectors)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

## Testing Your Setup

1. Start the development server:
   ```bash
   pnpm run dev
   ```

2. Test the account endpoint:
   ```bash
   curl "http://localhost:3001/api/trpc/collector.account"
   ```

   You should see your AWS account information and `credentialsValid: true`.

3. Test a collector:
   ```bash
   curl -X POST http://localhost:3001/api/trpc/collector.collect \
     -H "Content-Type: application/json" \
     -d '{"json":{"types":["rds"],"profile":"staging","region":"us-east-1","async":false}}'
   ```

## Troubleshooting

### Common Issues

1. **"Unable to configure AWS credentials"**
   - Check that your credentials are correctly set in `.env` or AWS credentials file
   - Verify that the profile name matches what you've configured

2. **"Access Denied" errors**
   - Check that your AWS user/role has the required permissions
   - Verify that the AWS region is correct

3. **"Region not supported" errors**
   - Some AWS services are not available in all regions
   - Try using `us-east-1` which has the most complete service coverage

4. **Environment variables not loading**
   - Make sure your `.env` file is in the root directory
   - Restart the development server after changing environment variables
   - Check that variable names match exactly (case-sensitive)

### Debug Mode

Set this in your `.env` for more detailed logging:
```bash
NODE_ENV="development"
```

The collectors will output detailed logs showing what credentials they're using and what API calls they're making.