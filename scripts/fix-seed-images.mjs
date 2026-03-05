import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL);

const updates = [
  ["https://picsum.photos/seed/sony-a7iii/640/480", "/images/seed/sony-a7iii.webp"],
  ["https://picsum.photos/seed/garden-tools/640/480", "/images/seed/garden-tools.webp"],
  ["https://picsum.photos/seed/design-services/640/480", "/images/seed/design-services.webp"],
  ["https://picsum.photos/seed/nike-air-max/640/480", "/images/seed/nike-air-max.webp"],
  ["https://picsum.photos/seed/guitar-lessons/640/480", "/images/seed/guitar-lessons.webp"],
  ["https://picsum.photos/seed/trek-bike/640/480", "/images/seed/trek-bike.webp"],
];

for (const [newUrl, oldUrl] of updates) {
  const result = await sql`UPDATE listing_images SET url = ${newUrl} WHERE url = ${oldUrl}`;
  console.log(`Updated "${oldUrl}" → "${newUrl}"`);
}

console.log("Done.");
