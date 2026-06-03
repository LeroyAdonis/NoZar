import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const rows = await sql("SELECT COUNT(*) as cnt FROM listings WHERE status = 'active'");
const users = await sql("SELECT name, email FROM users WHERE email LIKE '%nozar.demo'");
console.log('Active listings:', rows[0].cnt);
console.log('Demo users:', users.map(u => `${u.name} <${u.email}>`).join(', '));
