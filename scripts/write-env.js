/**
 * Pre-build script: writes environment files from env vars or .env file.
 * Used in Vercel deploy to inject config at build time.
 */
const fs = require('fs');
const path = require('path');

// Cargar .env si existe (para desarrollo local)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
}

const dir = path.join(__dirname, '..', 'src', 'environments');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const prodContent = `export const environment = {
  production: true,
  apiBase: '/api/v1',
};
`;

const devContent = `export const environment = {
  production: false,
  apiBase: '/api/v1',
};
`;

fs.writeFileSync(path.join(dir, 'environment.production.ts'), prodContent);
fs.writeFileSync(path.join(dir, 'environment.ts'), devContent);

console.log('✅ Environment files written');
