# AWS Resource Manager

A comprehensive dashboard for discovering, managing, and monitoring AWS resources across multiple accounts and regions. Built with Next.js, TypeScript, and the T3 Stack for scalability and type safety.

## ✨ Features

- **Multi-Service Discovery**: Automatically discover resources across 15+ AWS services
- **Multi-Account & Multi-Region**: Manage resources across different AWS accounts and regions
- **Real-time Dashboard**: Interactive dashboards with resource statistics and health monitoring
- **Resource Categorization**: Organize and categorize resources for better management
- **Migration Planning**: Tools to map and plan resource migrations
- **Export Capabilities**: Export resource data in multiple formats (JSON, CSV)
- **Role-Based Access**: Secure authentication with NextAuth.js
- **Responsive Design**: Modern UI with dark/light theme support

## 🛠️ Technology Stack

- **Frontend**: [Next.js 15](https://nextjs.org/) with React 19
- **Backend**: [tRPC](https://trpc.io/) for type-safe APIs
- **Database**: [Drizzle ORM](https://orm.drizzle.team) with SQLite
- **Authentication**: [NextAuth.js](https://next-auth.js.org)
- **Styling**: [Tailwind CSS](https://tailwindcss.com) with shadcn/ui components
- **AWS Integration**: AWS SDK v3 for multiple services
- **Type Safety**: Full TypeScript support throughout

## 📊 Supported AWS Services

- **Compute**: EC2, ECS, Lambda, Step Functions
- **Storage**: S3, EBS Volumes
- **Database**: RDS, DynamoDB, ElastiCache
- **Networking**: VPC, Load Balancers, Route 53, CloudFront
- **Containers**: ECR repositories
- **API Management**: API Gateway (REST & HTTP)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- AWS Account with appropriate permissions

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/zoca-ai/aws-resources.git
   cd aws-resources
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   ```bash
   # Database
   DATABASE_URL="file:./db.sqlite"

   # NextAuth
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"

   # AWS Configuration
   AWS_REGION="us-east-1"
   AWS_PROFILE="default"
   ```

4. **Set up the database:**
   ```bash
   pnpm db:push
   ```

5. **Start the development server:**
   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔧 AWS Configuration

The application supports multiple AWS credential configurations:

### Option 1: AWS Credentials File (Recommended)
```bash
# ~/.aws/credentials
[default]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY

[staging]
aws_access_key_id = YOUR_STAGING_ACCESS_KEY_ID
aws_secret_access_key = YOUR_STAGING_SECRET_ACCESS_KEY
```

### Option 2: Environment Variables
```bash
AWS_ACCESS_KEY_ID="your-access-key-id"
AWS_SECRET_ACCESS_KEY="your-secret-access-key"
AWS_REGION="us-east-1"
```

For detailed AWS setup instructions, see [AWS_SETUP.md](./AWS_SETUP.md).

## 📦 Available Scripts

```bash
# Development
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm preview      # Build and start production server

# Database
pnpm db:generate  # Generate database migrations
pnpm db:push      # Push database schema changes
pnpm db:migrate   # Run database migrations
pnpm db:studio    # Open Drizzle Studio

# Code Quality
pnpm typecheck    # Run TypeScript type checking
pnpm check        # Run Biome linter and formatter
pnpm check:write  # Run Biome with auto-fix

# Docker
pnpm docker:build # Build Docker image
pnpm docker:run   # Run Docker container
```

## 🌐 Deployment

### Docker Deployment
```bash
# Build and run with Docker
pnpm docker:build
pnpm docker:run
```

### AWS Lightsail Deployment
For production deployment on AWS Lightsail with load balancer:
```bash
chmod +x scripts/deploy-lightsail.sh
./scripts/deploy-lightsail.sh
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🏗️ Project Structure

```
src/
├── app/                 # Next.js 15 App Router
│   ├── api/            # API routes
│   ├── auth/           # Authentication pages
│   ├── collect/        # Resource collection page
│   ├── resources/      # Resource management
│   └── migration/      # Migration planning tools
├── components/         # React components
│   ├── ui/            # Reusable UI components
│   ├── auth/          # Authentication components
│   ├── categorization/# Resource categorization
│   └── mapping/       # Resource mapping
├── server/            # Backend logic
│   ├── api/          # tRPC routers
│   ├── collectors/   # AWS resource collectors
│   ├── auth/         # Authentication config
│   └── db/           # Database schema and connection
├── lib/              # Utility functions
└── styles/           # Global styles
```

## 🔍 Key Features Explained

### Resource Discovery
- Automatically scans AWS accounts for resources across multiple services
- Supports custom regions and profiles
- Real-time progress tracking during collection

### Resource Management
- Categorize resources by environment, team, or custom criteria
- Bulk operations for efficient management
- Advanced filtering and search capabilities

### Migration Planning
- Map resources between environments
- Track migration progress
- Export migration plans

### Security & Permissions
- Uses AWS SDK with proper credential management
- Supports IAM roles and cross-account access
- Minimal required permissions for each service

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- Check the [AWS Setup Guide](./AWS_SETUP.md) for configuration help
- Review [Deployment Guide](./DEPLOYMENT.md) for deployment issues
- Open an issue for bugs or feature requests

## 🙏 Acknowledgments

- Built with [T3 Stack](https://create.t3.gg/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- AWS integration powered by [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/)