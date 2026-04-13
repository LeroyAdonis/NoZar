/*
Simple seed script to insert test profiles from scripts/seed-test-profiles.json
Run locally with: node scripts/seed-profiles.js
Requires DATABASE_URL in env.
*/

const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const raw = fs.readFileSync('scripts/seed-test-profiles.json', 'utf8');
  const fixtures = JSON.parse(raw);
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  for (const f of fixtures) {
    const user = f.user;
    const profile = f.profile;
    const listings = f.listings || [];

    await client.query('INSERT INTO users (id, name, email, created_at, updated_at) VALUES ($1,$2,$3,now(),now()) ON CONFLICT (id) DO NOTHING', [user.id, user.name, user.email]);
    await client.query('INSERT INTO profiles (user_id, display_name, bio, city, suburb, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,now(),now()) ON CONFLICT (user_id) DO NOTHING', [user.id, profile.displayName || user.name, profile.bio || null, profile.city || null, profile.suburb || null]);

    for (const l of listings) {
      await client.query('INSERT INTO listings (id, user_id, title, description, category, estimated_value_zar, type, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now(),now()) ON CONFLICT (id) DO NOTHING', [l.id, user.id, l.title, l.description, l.category || null, l.estimatedValueZar || null, l.type || 'item', l.status || 'active']);
    }
  }

  await client.end();
  console.log('Seeding complete');
}

main().catch((err) => { console.error(err); process.exit(1); });