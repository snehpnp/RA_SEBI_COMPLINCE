module.exports = {
  apps: [
    {
      name: "RA_complice_backend",
      script: "./dist/index.js",
      env: {
        NODE_ENV: "production",
      },
      env_file: ".env"
    }
  ]
};
