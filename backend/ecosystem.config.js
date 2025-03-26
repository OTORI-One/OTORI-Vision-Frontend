module.exports = {
  apps: [
    {
      name: 'otori-price-api',
      script: './api/index.js',
      watch: true,
      env: {
        NODE_ENV: 'development',
        PORT: 3030
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3030
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M',
      time: true
    }
  ]
}; 