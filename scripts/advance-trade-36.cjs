require('dotenv').config({path:'.env.production'});
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function main() {
  const tradeId = 36;

  // 1. Update trade to contact_shared
  await sql`UPDATE trades SET status = 'contact_shared', updated_at = NOW() WHERE id = ${tradeId}`;
  console.log('1. Trade status -> contact_shared');

  // 2. Create meetup spots
  const spots = [
    { name: 'Canal Walk Shopping Centre', address: '490 Chris Barnard Rd, Century City', reason: 'Popular mall with CCTV and security guards' },
    { name: 'Tyger Valley Centre', address: '114 Bill Bezuidenhout Ave, Tyger Valley', reason: 'Busy shopping centre, well-lit parking' },
    { name: 'Willowbridge Shopping Centre', address: 'Carl Cronje Dr, Bellville', reason: 'Safe public area with 24hr security' },
  ];

  await sql`DELETE FROM meetup_spots WHERE trade_id = ${tradeId}`;
  for (let i = 0; i < spots.length; i++) {
    const s = spots[i];
    await sql`INSERT INTO meetup_spots (trade_id, name, address, reason, "order") VALUES (${tradeId}, ${s.name}, ${s.address}, ${s.reason}, ${i})`;
  }
  console.log('2. Created 3 meetup spots');

  // 3. Both users vote on first spot
  await sql`DELETE FROM meetup_votes WHERE trade_id = ${tradeId}`;
  const [spot1] = await sql`SELECT id FROM meetup_spots WHERE trade_id = ${tradeId} ORDER BY id LIMIT 1`;
  const users = await sql`SELECT id FROM users WHERE id IN ('7138a260-b88b-4539-8069-7a6445c49a54', 'iP2fq6sitmKKu8GJOLexGgG7UapgVus6')`;
  for (const u of users) {
    await sql`INSERT INTO meetup_votes (trade_id, user_id, spot_id) VALUES (${tradeId}, ${u.id}, ${spot1.id})`;
  }
  console.log('3. Both users voted on spot ' + spot1.id);

  // 4. Contact disclosures
  await sql`DELETE FROM contact_disclosures WHERE trade_id = ${tradeId}`;
  await sql`INSERT INTO contact_disclosures (trade_id, user_id, disclosed_fields, expires_at)
    VALUES (${tradeId}, '7138a260-b88b-4539-8069-7a6445c49a54',
    '{"phone":"+277...5678","email":"ricky@nozar.test"}',
    NOW() + INTERVAL '48 hours')`;
  await sql`INSERT INTO contact_disclosures (trade_id, user_id, disclosed_fields, expires_at)
    VALUES (${tradeId}, 'iP2fq6sitmKKu8GJOLexGgG7UapgVus6',
    '{"phone":"+277...5432","email":"leroyadonis3@gmail.com"}',
    NOW() + INTERVAL '48 hours')`;
  console.log('4. Contact disclosures created');

  // 5. System message
  await sql`INSERT INTO messages (trade_id, sender_id, text, type, created_at)
    VALUES (${tradeId}, '7138a260-b88b-4539-8069-7a6445c49a54', 'Both shared contacts - coordinate your meetup!', 'system', NOW())`;
  console.log('5. System message added');

  console.log('\nTrade #36 ready for testing at contact_shared status.');
}

main().catch(console.error);
