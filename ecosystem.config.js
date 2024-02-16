module.exports = {
  apps: [
    {
      name: 'server',
      script: 'dist/server/app.js',
      instances: 2,
      wait_ready: true,
    },
    {
      name: 'revalidator',
      script: 'dist/scripts/revalidate.js',
      wait_ready: true,
    },
  ],
}
