/// <reference types="node" />
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Generate a bcrypt hash for admin password from initial-data.json
 * Usage: npx ts-node scripts/generate-admin-hash.ts
 *
 * Reads the admin user configuration from backend/config/initial-data.json
 * and generates a password hash for the configured password.
 */
async function generatePasswordHash(password: string) {
  const hash = await bcrypt.hash(password, 10);
  return hash;
}

// Resolve config file path
const configPath = path.join(process.cwd(), 'config', 'initial-data.json');

// Check if config file exists
if (!fs.existsSync(configPath)) {
  console.error(`Error: Config file not found: ${configPath}`);
  console.error('Please ensure backend/config/initial-data.json exists');
  process.exit(1);
}

// Read and parse config file
const configContent = fs.readFileSync(configPath, 'utf-8');
const config = JSON.parse(configContent);

// Find admin user
const adminUser = config.users?.find((user: any) => user.role === 'admin');

if (!adminUser) {
  console.error('Error: No admin user found in initial-data.json');
  console.error('Please add an admin user to the config file');
  process.exit(1);
}

// Extract password (might be env var syntax like ${ADMIN_PASSWORD:-default})
let password = adminUser.password || '';
if (password.startsWith('${') && password.endsWith('}')) {
  const envVar = password.slice(2, -1);
  const parts = envVar.includes(':-') ? envVar.split(':-') : [envVar, ''];
  const varName = parts[0];
  const defaultValue = parts[1] || '';
  password = process.env[varName] || defaultValue;

  if (!password) {
    console.error(`Error: Password not found. Set ${varName} environment variable or provide default value in config.`);
    process.exit(1);
  }
}

console.log('Reading admin user from initial-data.json:');
console.log(`  ID: ${adminUser.id}`);
console.log(`  Email: ${adminUser.email}`);
console.log(`  Name: ${adminUser.name}`);
console.log(`  Role: ${adminUser.role}`);
console.log(`\nGenerating password hash...`);

generatePasswordHash(password).then((hash) => {
  console.log('\n✅ Password hash generated:');
  console.log(hash);
  console.log('\n📝 This hash can be used to manually update the database if needed.');
  console.log('   The setup service will automatically hash passwords on startup.');
});

