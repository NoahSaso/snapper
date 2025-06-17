module.exports = {
  apps: [
    {
      name: 'server',
      script: 'dist/server/app.js',
      instances: 2,
      wait_ready: true,
      env: {
        PORT: 3000,
      },
    },
    {
      name: 'workers',
      script: 'dist/queues/process.js',
      wait_ready: true,
      listen_timeout: 30000,
      env: {
        PORT: 3001,
      },
    },
  ],
}
