#!/usr/bin/env node
const { spawn } = require('child_process');

const command = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';
const args = ['build'];

const child = spawn(command, args, {
  stdio: 'inherit',
  env: { ...process.env, PUBLIC_URL: '/peien_portfolio' },
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});
