// PM2 Configuration for Birthday Invitation App
// .env файл копируется в релиз при деплое скриптом deploy.sh

module.exports = {
  apps: [
    {
      name: 'birthday-backend',
      script: './backend/dist/server.js',
      cwd: '/var/www/birthday/current',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/www/birthday/shared/logs/backend-error.log',
      out_file: '/var/www/birthday/shared/logs/backend-out.log',
      time: true
    }
  ]
}
