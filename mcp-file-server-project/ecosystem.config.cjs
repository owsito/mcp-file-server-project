module.exports = {
  apps: [{
    name: 'student-mcp-file-server',
    script: './server.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '250M',
    env: { NODE_ENV: 'production' }
  }]
};
