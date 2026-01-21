# Production Deployment Guide - Gastronomy OS

## Overview

This guide walks through deploying the Gastronomy OS to production. The system is built on:
- **Frontend:** React + Vite (deployed to Netlify/Vercel)
- **Backend:** Express.js with Prisma ORM
- **Database:** PostgreSQL (NeonDB)
- **Authentication:** Clerk
- **Payments:** Stripe
- **Hosting Options:** Netlify, Vercel, or Railway

## Pre-Deployment Checklist

### 1. Code Review & Testing
- [ ] All feature branches merged to `staging`
- [ ] Unit tests pass: `pnpm test`
- [ ] Build succeeds: `pnpm run build:server` and `pnpm run build`
- [ ] No console errors or warnings
- [ ] Code follows project conventions
- [ ] Documentation updated

### 2. Environment Variables
- [ ] Copy all secrets from staging environment
- [ ] Verify all required env vars are set:
  ```
  CLERK_SECRET_KEY (production key)
  VITE_CLERK_PUBLISHABLE_KEY (production key)
  STRIPE_SECRET_KEY (production key)
  STRIPE_WEBHOOK_SECRET (production secret)
  DATABASE_URL (production database)
  JWT_SECRET (production secret)
  SITE_URL (production domain)
  ```

### 3. Database
- [ ] Production database created (NeonDB or PostgreSQL)
- [ ] Database URL configured in .env
- [ ] Prisma migrations ready: `npx prisma migrate status`
- [ ] Backup of staging database created
- [ ] Database scaling plan reviewed

### 4. Security
- [ ] All secrets are in environment variables (never committed)
- [ ] Webhook secrets verified (Clerk, Stripe)
- [ ] CORS origin configured for production domain
- [ ] SSL/TLS certificates configured
- [ ] Rate limiting configured
- [ ] SQL injection protections verified

### 5. Infrastructure
- [ ] Hosting provider account set up (Netlify/Vercel)
- [ ] CDN configured (optional, Netlify/Vercel provide this)
- [ ] Monitoring/alerting configured
- [ ] Backup strategy defined
- [ ] Disaster recovery plan reviewed

## Deployment Steps

### Option A: Deploy to Netlify

#### Step 1: Connect Repository
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Connect repo
netlify init
```

#### Step 2: Configure Build Settings
```
Build command: pnpm run build
Publish directory: dist
```

#### Step 3: Set Environment Variables
```
Netlify Dashboard → Settings → Build & Deploy → Environment

Add all production environment variables
```

#### Step 4: Deploy
```bash
netlify deploy --prod
```

### Option B: Deploy to Vercel

#### Step 1: Connect Repository
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel
```

#### Step 2: Configure Project
```
Framework: Vite
Build command: pnpm run build
Output directory: dist
```

#### Step 3: Set Environment Variables
```
Vercel Dashboard → Project Settings → Environment Variables

Add all production environment variables
```

#### Step 4: Deploy
```bash
vercel deploy --prod
```

### Option C: Deploy to Railway

#### Step 1: Create Railway Project
- Go to [railway.app](https://railway.app)
- Create new project
- Connect GitHub repository

#### Step 2: Configure Services
```
1. Node.js Service
   Start command: node dist/server/node-build.mjs
   
2. PostgreSQL Service
   (or use external NeonDB)
```

#### Step 3: Set Environment Variables
```
Railway Dashboard → Project → Variables

Add all production environment variables
```

#### Step 4: Deploy
```bash
# Push to main/production branch
git push origin main

# Railway auto-deploys
```

## Database Migration

### Step 1: Prepare Production Database

```bash
# Create new production database on NeonDB
# Copy connection string

# Set DATABASE_URL to production database
export DATABASE_URL="postgresql://..."
```

### Step 2: Run Migrations

```bash
# Apply all pending migrations
npx prisma migrate deploy

# Or baseline if migrating from existing schema
npx prisma migrate resolve --applied add_configuration_table
```

### Step 3: Seed Data (Optional)

```bash
# Populate template marketplace
pnpm prisma db seed

# This creates:
# - Template: minimalist, modern, stylish, cozy
# - Subscription plans (free, basic, pro, enterprise)
```

### Step 4: Verify

```bash
# Check database connection
npx prisma studio

# Verify tables exist
npx prisma db execute --stdin < check_tables.sql
```

## Webhook Configuration

### Clerk Webhooks

1. Go to Clerk Dashboard → Webhooks
2. Create endpoint: `https://your-domain.com/api/webhooks/clerk`
3. Select events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
4. Copy signing secret to `CLERK_WEBHOOK_SECRET`

### Stripe Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Create endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events:
   - `customer.created`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `payment_intent.succeeded`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `charge.refunded`
4. Copy signing secret to `STRIPE_WEBHOOK_SECRET`

## Post-Deployment

### 1. Smoke Tests

```bash
# Health check
curl https://your-domain.com/health

# API test
curl https://your-domain.com/api/ping

# Configuration endpoint (requires auth)
curl -H "Authorization: Bearer {TOKEN}" https://your-domain.com/api/configurations
```

### 2. Monitoring

- [ ] Set up error tracking (Sentry, Rollbar)
- [ ] Set up uptime monitoring (StatusPage, UptimeRobot)
- [ ] Set up performance monitoring (DataDog, New Relic)
- [ ] Set up log aggregation (Logtail, DataDog)
- [ ] Create alerting rules for critical errors

### 3. Documentation

- [ ] Update README with production URLs
- [ ] Create runbook for common incidents
- [ ] Document emergency procedures
- [ ] Create dashboard for status monitoring

### 4. User Communication

- [ ] Announce launch to early users
- [ ] Send onboarding emails
- [ ] Create knowledge base articles
- [ ] Set up support channels (email, chat, etc.)

## Rollback Procedure

If critical issues are discovered post-deployment:

### Immediate Action
```bash
# Option 1: Redeploy previous version (Netlify/Vercel)
# Go to Dashboard → Deployments → Select previous deployment → Redeploy

# Option 2: Git rollback (Railway)
git revert {commit_hash}
git push origin main
```

### Database Rollback
```bash
# If migrations caused issues, rollback last migration
npx prisma migrate resolve --rolled-back migration_name

# Or restore from backup
# (restore backup from NeonDB/PostgreSQL)
```

## Scaling Considerations

### Phase 1: MVP (0-100 users)
- Single PostgreSQL instance (NeonDB free tier)
- Single application instance
- Netlify/Vercel default CDN
- Cost: ~$0 (free tiers)

### Phase 2: Growth (100-1,000 users)
- Upgrade PostgreSQL (NeonDB paid tier)
- Scale to 2-3 application instances
- Enable database connection pooling
- Add monitoring and alerting
- Cost: ~$100-200/month

### Phase 3: Scale (1,000-10,000 users)
- PostgreSQL with read replicas
- Kubernetes cluster (ECS/GKE)
- Redis cache layer
- CDN optimization
- Advanced monitoring
- Cost: ~$500-1,000/month

### Phase 4: Enterprise (10,000+ users)
- Dedicated database infrastructure
- Multi-region deployment
- Advanced caching strategies
- Full-featured APM
- Professional support
- Cost: >$1,000/month

## Maintenance & Updates

### Regular Tasks
- [ ] Monitor error logs daily
- [ ] Review performance metrics weekly
- [ ] Update dependencies monthly
- [ ] Review security advisories weekly
- [ ] Backup database weekly

### Update Procedure
```bash
# 1. Update dependencies
pnpm update

# 2. Test locally
pnpm test
pnpm run build

# 3. Commit and push
git commit -m "chore: update dependencies"
git push origin main

# 4. Deploy to staging first
# (verify in staging environment)

# 5. Deploy to production
# (automatic via CI/CD or manual deployment)

# 6. Monitor for issues
# (watch error logs and performance metrics)
```

## Disaster Recovery

### Database Backup Strategy
- Automated nightly backups (NeonDB handles this)
- Weekly manual backups to S3
- Test restore procedure monthly

### Code Backup Strategy
- Git repository with multiple remotes
- Daily backup of git history
- Release tags for all production deployments

### Recovery Time Objective (RTO)
- Critical bugs: 15 minutes (rollback)
- Database corruption: 1 hour (restore from backup)
- Infrastructure failure: 4 hours (migrate to new provider)

## Cost Optimization

### Development
- Use free tiers for all services during development
- NeonDB free tier for development database
- Netlify free tier for staging deployment

### Production
- NeonDB Pro: $15/month (scales to your usage)
- Netlify Pro: $19/month (or Vercel equivalent)
- Stripe: 2.9% + $0.30 per transaction
- Clerk: Free for up to 10,000 monthly active users
- Total: ~$35-50/month for MVP

## Security Hardening

### Before Launch
- [ ] Enable HTTPS everywhere
- [ ] Configure CORS headers
- [ ] Enable CSRF protection
- [ ] Set security headers (CSP, X-Frame-Options, etc.)
- [ ] Enable rate limiting
- [ ] Review authentication/authorization
- [ ] Audit database permissions
- [ ] Enable audit logging
- [ ] Configure WAF (Web Application Firewall)

### Ongoing
- [ ] Weekly dependency vulnerability scans
- [ ] Monthly penetration testing
- [ ] Quarterly security audit
- [ ] Implement bug bounty program

## Support & Resources

### Documentation
- [Clerk Documentation](https://clerk.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Netlify Deployment Guide](https://docs.netlify.com/)
- [Vercel Deployment Guide](https://vercel.com/docs)

### Community
- GitHub Issues for bug reports
- GitHub Discussions for feature requests
- Community Slack/Discord (optional)

## Production Monitoring Dashboard

Monitor these metrics after deployment:

```
1. Application Health
   - Error rate (target: <0.1%)
   - Response time (target: <500ms)
   - Uptime (target: >99.9%)

2. Database Health
   - Connection pool usage
   - Query performance
   - Storage used

3. Authentication
   - Login success rate
   - Failed login attempts
   - Active users

4. Payments
   - Transaction success rate
   - Payment processing time
   - Revenue metrics

5. API Usage
   - Requests per minute
   - API endpoint performance
   - Rate limit violations
```

## Launch Checklist

### Before Going Live
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Monitoring configured
- [ ] Backups working
- [ ] Team trained on procedures
- [ ] Incident response plan in place

### Launch Day
- [ ] Deploy to production during low-traffic time
- [ ] Monitor metrics closely (first 2 hours)
- [ ] Have team available for quick response
- [ ] Prepare rollback if needed
- [ ] Document any issues encountered

### Post-Launch
- [ ] Send launch announcement
- [ ] Start customer onboarding
- [ ] Gather feedback
- [ ] Iterate on issues
- [ ] Plan next features

## Next Steps

1. **Set up Netlify/Vercel/Railway account** (if not done)
2. **Configure production database** (NeonDB or PostgreSQL)
3. **Set production Clerk/Stripe credentials**
4. **Run through this deployment guide** on staging branch
5. **Test deployment thoroughly** before going to main/production
6. **Schedule launch announcement** with team
7. **Monitor closely during first 24 hours** after launch

Good luck with your launch! 🚀
