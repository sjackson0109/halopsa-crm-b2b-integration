# Deployment Guide

## Overview

This guide covers deployment strategies for the HaloPSA CRM Custom Integration in various environments, from development to production.

## Deployment Options

### 1. Docker Deployment (Recommended)

#### Single Container Deployment
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
```

#### Docker Compose for Development
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:password@db:5432/halopsa_integration
    depends_on:
      - db
      - redis
    volumes:
      - .:/app
      - /app/node_modules

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=halopsa_integration
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

#### Production Docker Compose
```yaml
version: '3.8'

services:
  halopsa-integration:
    image: halopsa-integration:latest
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15
    restart: unless-stopped
    environment:
      - POSTGRES_DB=halopsa_integration
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
  redis_data:
```

### 2. Traditional Server Deployment

#### System Requirements
- Ubuntu 20.04 LTS or CentOS 8+
- 4GB RAM minimum, 8GB recommended
- 50GB storage
- Node.js 18.x LTS

#### Installation Script
```bash
#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Create application directory
sudo mkdir -p /opt/halopsa-integration
sudo chown $USER:$USER /opt/halopsa-integration

# Clone repository
cd /opt/halopsa-integration
git clone https://github.com/sjackson0109/halopsa-crm-b2b-integration.git .
npm ci --only=production

# Create environment file
cp .env.example .env
# Edit .env with production values

# Setup PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### PM2 Ecosystem Configuration
```javascript
module.exports = {
  apps: [{
    name: 'halopsa-integration',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

### 3. Cloud Platform Deployments

#### AWS ECS Fargate
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'HaloPSA Integration ECS Fargate'

Resources:
  Cluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: halopsa-integration

  TaskDefinition:
    Type: AWS::ECS::TaskDefinition
    Properties:
      Family: halopsa-integration
      Cpu: '1024'
      Memory: '2048'
      NetworkMode: awsvpc
      RequiresCompatibilities:
        - FARGATE
      ExecutionRoleArn: !Ref ExecutionRole
      TaskRoleArn: !Ref TaskRole
      ContainerDefinitions:
        - Name: app
          Image: halopsa-integration:latest
          Essential: true
          PortMappings:
            - ContainerPort: 3000
              Protocol: tcp
          Environment:
            - Name: NODE_ENV
              Value: production
            - Name: PORT
              Value: '3000'
          LogConfiguration:
            LogDriver: awslogs
            Options:
              awslogs-group: !Ref LogGroup
              awslogs-region: !Ref AWS::Region
              awslogs-stream-prefix: ecs

  Service:
    Type: AWS::ECS::Service
    Properties:
      ServiceName: halopsa-integration
      Cluster: !Ref Cluster
      TaskDefinition: !Ref TaskDefinition
      DesiredCount: 2
      LaunchType: FARGATE
      NetworkConfiguration:
        AwsvpcConfiguration:
          AssignPublicIp: ENABLED
          SecurityGroups:
            - !Ref SecurityGroup
          Subnets:
            - !Ref Subnet1
            - !Ref Subnet2
```

#### Google Cloud Run
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: halopsa-integration
spec:
  template:
    spec:
      containers:
      - image: gcr.io/project-id/halopsa-integration:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        - name: PORT
          value: "3000"
        resources:
          limits:
            cpu: 1000m
            memory: 2Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### Azure Container Instances
```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "containerName": {
      "type": "string",
      "defaultValue": "halopsa-integration"
    }
  },
  "resources": [
    {
      "type": "Microsoft.ContainerInstance/containerGroups",
      "apiVersion": "2021-07-01",
      "name": "[parameters('containerName')]",
      "location": "[resourceGroup().location]",
      "properties": {
        "containers": [
          {
            "name": "halopsa-integration",
            "properties": {
              "image": "halopsa-integration:latest",
              "ports": [
                {
                  "port": 3000,
                  "protocol": "TCP"
                }
              ],
              "environmentVariables": [
                {
                  "name": "NODE_ENV",
                  "value": "production"
                }
              ],
              "resources": {
                "requests": {
                  "cpu": 1,
                  "memoryInGB": 2
                }
              },
              "livenessProbe": {
                "httpGet": {
                  "path": "/health",
                  "port": 3000
                },
                "initialDelaySeconds": 30,
                "periodSeconds": 30
              }
            }
          }
        ],
        "osType": "Linux",
        "ipAddress": {
          "type": "Public",
          "ports": [
            {
              "port": 3000,
              "protocol": "TCP"
            }
          ]
        }
      }
    }
  ]
}
```

## Load Balancing and Scaling

### Nginx Configuration
```nginx
upstream halopsa_integration {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3002 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limiting
    limit_req zone=api burst=20 nodelay;
    limit_req_status 429;

    location / {
        proxy_pass http://halopsa_integration;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout settings
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;

        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Metrics endpoint (protected)
    location /metrics {
        allow 10.0.0.0/8;
        deny all;
        proxy_pass http://halopsa_integration;
    }
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
```

### HAProxy Configuration
```haproxy
global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin expose-fd listeners
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

defaults
    log global
    mode http
    option httplog
    option dontlognull
    timeout connect 5000
    timeout client 50000
    timeout server 50000

frontend http_front
    bind *:80
    default_backend halopsa_integration

backend halopsa_integration
    balance leastconn
    option httpchk GET /health
    http-check expect status 200
    default-server inter 3s fall 3 rise 2

    server app1 127.0.0.1:3000 check
    server app2 127.0.0.1:3001 check
    server app3 127.0.0.1:3002 check

listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 10s
```

## Database Deployment

### PostgreSQL High Availability
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_DB
          value: halopsa_integration
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - $(POSTGRES_USER)
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - $(POSTGRES_USER)
          initialDelaySeconds: 5
          periodSeconds: 5
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 50Gi
```

### Redis Cluster Setup
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
spec:
  serviceName: redis-cluster
  replicas: 6
  selector:
    matchLabels:
      app: redis-cluster
  template:
    metadata:
      labels:
        app: redis-cluster
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command:
        - redis-server
        - /etc/redis/redis.conf
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: redis-config
          mountPath: /etc/redis
        - name: redis-storage
          mountPath: /data
        livenessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: redis-config
        configMap:
          name: redis-config
  volumeClaimTemplates:
  - metadata:
      name: redis-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

## Monitoring and Alerting

### Prometheus Configuration
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'halopsa-integration'
    static_configs:
      - targets: ['halopsa-integration:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:9187']
    scrape_interval: 30s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:9121']
    scrape_interval: 30s
```

### Grafana Dashboards
```json
{
  "dashboard": {
    "title": "HaloPSA Integration Overview",
    "tags": ["halopsa", "integration"],
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m]) / rate(http_requests_total[5m]) * 100",
            "legendFormat": "Error rate %"
          }
        ]
      }
    ]
  }
}
```

## Security Hardening

### SSL/TLS Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://halopsa_integration;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Secrets Management
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: halopsa-integration-secrets
type: Opaque
data:
  halopsa-client-id: <base64-encoded-client-id>
  halopsa-client-secret: <base64-encoded-client-secret>
  database-password: <base64-encoded-db-password>
  redis-password: <base64-encoded-redis-password>
```

## Backup and Recovery

### Database Backup Strategy
```bash
#!/bin/bash

# Daily backup script
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/halopsa_integration_$DATE.sql"

# Create backup
pg_dump -h localhost -U $DB_USER -d $DB_NAME > $BACKUP_FILE

# Compress
gzip $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE.gz s3://your-backup-bucket/

# Clean old backups (keep last 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

# Verify backup
if [ $? -eq 0 ]; then
    echo "Backup completed successfully"
else
    echo "Backup failed"
    exit 1
fi
```

### Disaster Recovery
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-cronjob
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:15
            command:
            - /bin/bash
            - -c
            - |
              pg_dump -h postgres -U $POSTGRES_USER $POSTGRES_DB > /backup/backup.sql
              gzip /backup/backup.sql
            env:
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: username
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: password
            - name: POSTGRES_DB
              valueFrom:
                configMapKeyRef:
                  name: postgres-config
                  key: database
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
          restartPolicy: OnFailure
```

## Performance Optimization

### CDN Configuration
```javascript
// CloudFront distribution for static assets
const AWS = require('aws-sdk');

const cloudfront = new AWS.CloudFront();

const distributionConfig = {
  CallerReference: 'halopsa-integration-' + Date.now(),
  Comment: 'HaloPSA Integration CDN',
  DefaultCacheBehavior: {
    TargetOriginId: 'halopsa-integration-origin',
    ViewerProtocolPolicy: 'redirect-to-https',
    MinTTL: 0,
    DefaultTTL: 86400,  // 24 hours
    MaxTTL: 31536000,   // 1 year
    Compress: true,
    ForwardedValues: {
      QueryString: false,
      Cookies: {
        Forward: 'none'
      }
    }
  },
  Origins: {
    Quantity: 1,
    Items: [
      {
        Id: 'halopsa-integration-origin',
        DomainName: 'api.yourdomain.com',
        CustomOriginConfig: {
          HTTPPort: 80,
          HTTPSPort: 443,
          OriginProtocolPolicy: 'https-only'
        }
      }
    ]
  },
  Enabled: true
};
```

### Auto-scaling Configuration
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: halopsa-integration-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: halopsa-integration
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      - type: Pods
        value: 2
        periodSeconds: 60
```

## Deployment Checklist

### Pre-deployment
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database backups created
- [ ] Monitoring and alerting configured
- [ ] Load balancer configured
- [ ] Security groups/firewalls configured
- [ ] DNS records updated

### Deployment Steps
- [ ] Deploy to staging environment
- [ ] Run integration tests
- [ ] Perform load testing
- [ ] Update documentation
- [ ] Schedule maintenance window
- [ ] Deploy to production
- [ ] Monitor post-deployment
- [ ] Update DNS if needed

### Post-deployment
- [ ] Verify all endpoints responding
- [ ] Check monitoring dashboards
- [ ] Validate data synchronization
- [ ] Test webhook integrations
- [ ] Review performance metrics
- [ ] Update runbooks
- [ ] Communicate with stakeholders

## Rollback Procedures

### Quick Rollback
```bash
# Using Docker
docker tag halopsa-integration:latest halopsa-integration:rollback
docker pull halopsa-integration:previous-version
docker-compose up -d

# Using Kubernetes
kubectl rollout undo deployment/halopsa-integration

# Using PM2
pm2 revert ecosystem.config.js
pm2 reloadLogs
```

### Database Rollback
```bash
# Restore from backup
pg_restore -h localhost -U $DB_USER -d $DB_NAME /backups/backup.sql

# Or rollback specific migration
npm run migrate:rollback
```

## Maintenance Procedures

### Regular Maintenance Tasks
- **Daily**: Monitor logs and metrics
- **Weekly**: Update dependencies, review alerts
- **Monthly**: Security updates, performance review
- **Quarterly**: Major version updates, capacity planning

### Emergency Maintenance
1. Assess situation and impact
2. Notify stakeholders
3. Implement temporary measures
4. Perform maintenance
5. Test and validate
6. Communicate completion

This deployment guide provides comprehensive strategies for deploying the HaloPSA CRM Custom Integration in various environments with production-grade reliability, security, and scalability.