/**
 * Pre-build script: writes environment files from env vars or .env file.
 * Used in Vercel deploy to inject secrets at build time.
 * En local, lee del archivo .env en la raíz del proyecto.
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

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

const content = `export const environment = {
  production: true,
  supabaseUrl: '${supabaseUrl}',
  supabaseKey: '${supabaseKey}',
  apiBase: '/api/v1',
};
`;

fs.writeFileSync(path.join(dir, 'environment.production.ts'), content);
fs.writeFileSync(path.join(dir, 'environment.ts'), content.replace('production: true', 'production: false'));

console.log('✅ Environment files written');
