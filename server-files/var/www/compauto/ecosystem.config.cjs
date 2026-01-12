/**
 * PM2 Ecosystem Configuration for compauto-next
 *
 * Usage:
 *   Production: pm2 start ecosystem.config.cjs --only compauto-production
 *   Staging:    pm2 start ecosystem.config.cjs --only compauto-staging
 *   Both:       pm2 start ecosystem.config.cjs
 */

module.exports = {
  apps: [
    {
      name: 'compauto-production',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3003 --hostname 0.0.0.0',
      cwd: '/var/www/compauto/current',
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',

      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: '3003',
      },

      // 38
      error_file: '/var/www/compauto/shared/logs/production-error.log',
      out_file: '/var/www/compauto/shared/logs/production-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // 2B>?5@570?CA:
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',

      // 6840=85 ?5@54 ?5@570?CA:><
      kill_timeout: 5000,
      listen_timeout: 10000,

      // Graceful shutdown
      wait_ready: true,
      shutdown_with_message: true,
    },

    {
      name: 'compauto-staging',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3004 --hostname 0.0.0.0',
      cwd: '/var/www/compauto/staging',
      instances: 1,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '512M',

      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: '3004',
      },

      // 38
      error_file: '/var/www/compauto/shared-staging/logs/staging-error.log',
      out_file: '/var/www/compauto/shared-staging/logs/staging-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // 2B>?5@570?CA:
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',

      // 6840=85 ?5@54 ?5@570?CA:><
      kill_timeout: 5000,
      listen_timeout: 10000,

      // Graceful shutdown
      wait_ready: true,
      shutdown_with_message: true,
    },
  ],
};
