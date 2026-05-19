/**
 * PM2 Ecosystem Config — eGlobe Review Management System
 * Usage (production without Docker):
 *   pm2 start infrastructure/pm2.ecosystem.config.js
 *   pm2 save && pm2 startup
 */

module.exports = {
  apps: [
    {
      name:         "eglobe-backend",
      script:       "dist/server.js",
      cwd:          "./backend",
      instances:    "max",           // cluster mode — 1 per CPU core
      exec_mode:    "cluster",
      watch:        false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "development",
        PORT:     4000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT:     4000,
      },
      error_file:   "./logs/backend-error.log",
      out_file:     "./logs/backend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs:   true,
    },
    {
      name:         "eglobe-frontend",
      script:       "node_modules/.bin/next",
      args:         "start",
      cwd:          "./frontend",
      instances:    2,
      exec_mode:    "cluster",
      watch:        false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "development",
        PORT:     3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT:     3000,
      },
      error_file:   "./logs/frontend-error.log",
      out_file:     "./logs/frontend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs:   true,
    },
  ],
};
