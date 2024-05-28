module.exports = {
  apps: [
    {
      name: 'server',
      script: 'dist/server/app.js',
      instances: 2,
      wait_ready: true,
    },
    {
      name: 'workers',
      script: 'dist/queues/process.js',
      wait_ready: true,
      listen_timeout: 30000,
    },
  ],
}
