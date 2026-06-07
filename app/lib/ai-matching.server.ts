import { getConfiguredNvidiaApiKey } from "./nvidia-config.server";

// ─── Types ────────────────────────────────────────────────────

type EmbeddingResponse = {
  data: Array<{ embedding: number[] }>;
};

// ─── Embedding Cache (1-hour TTL) ─────────────────────────────

type CacheEntry = { embedding: number[]; expiresAt: number };
const embeddingCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Get a cached embedding, or null if expired/missing.
 */
function getCachedEmbedding(key: string): number[] | null {
  const entry = embeddingCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    embeddingCache.delete(key);
    return null;
  }
  return entry.embedding;
}

/**
 * Store an embedding in the cache with a 1-hour TTL.
 */
function setCachedEmbedding(key: string, embedding: number[]): void {
  embeddingCache.set(key, {
    embedding,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// ─── NVIDIA Embedding API ─────────────────────────────────────

const EMBEDDING_URL = "https://integrate.api.nvidia.com/v1/embeddings";
const EMBEDDING_MODEL = "nvidia/nv-embedqa-e5-v5";

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Call the NVIDIA embedding API for a single text input.
 * Uses the same auth key as the existing chat completion system.
 */
async function getEmbedding(
  input: string,
  inputType: "query" | "passage",
): Promise<number[]> {
  const key = getConfiguredNvidiaApiKey();
  if (!key) {
    throw new Error("NVIDIA_API_KEY not configured");
  }

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(EMBEDDING_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input,
          model: EMBEDDING_MODEL,
          input_type: inputType,
        }),
      });

      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        const raMs = retryAfter ? Number(retryAfter) * 1000 : 1000 * attempt;
        if (attempt === maxAttempts) {
          throw new Error("nvidia_rate_limited");
        }
        await delay(raMs + Math.random() * 200);
        continue;
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`NVIDIA Embedding API Error (${res.status}):`, errorText);
        if (res.status >= 500 && attempt < maxAttempts) {
          await delay(500 * attempt);
          continue;
        }
        throw new Error(`nvidia_embedding_api_error_${res.status}`);
      }

      const json: EmbeddingResponse = await res.json();
      if (json.data?.[0]?.embedding) {
        return json.data[0].embedding;
      }
      throw new Error("nvidia_embedding_unexpected_response");
    } catch (err) {
      console.error(`Embedding attempt ${attempt} failed:`, err);
      if (attempt === maxAttempts) throw err;
      await delay(300 * attempt);
    }
  }

  throw new Error("nvidia_embedding_unreachable");
}

// ─── Cosine Similarity ─────────────────────────────────────────

/**
 * Compute cosine similarity between two vectors.
 * Returns a value between 0 and 1 (1 = identical direction).
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  // Clamp to [0, 1] to handle floating point edge cases
  return Math.max(0, Math.min(1, dotProduct / magnitude));
}

// ─── Fallback: Simple Text Overlap Scoring ────────────────────

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "shall", "can", "need", "want",
  "looking", "trade", "barter", "swap", "exchange", "offers", "open",
  "offering", "willing", "much", "many", "stuff", "items", "things",
  "something", "anything", "good", "great", "nice", "like", "new", "used",
  "including", "includes", "please", "thank", "thanks", "also", "quality",
  "excellent", "perfect", "well", "really", "some", "any", "get", "got",
  "interested", "must", "can", "work", "way", "make", "done", "ever",
  "say", "still", "even", "back", "put", "keep", "let", "know", "see",
  "come", "take", "use", "made", "power",
]);

/**
 * Fallback scoring using keyword overlap when NVIDIA is unavailable.
 * Returns a 0–1 similarity score based on shared words between texts.
 */
function textOverlapScore(userText: string, listingText: string): number {
  const tokenize = (text: string): Set<string> =>
    new Set(
      text
        .toLowerCase()
        .split(/[\W_]+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w)),
    );

  const userTokens = tokenize(userText);
  const listingTokens = tokenize(listingText);

  if (userTokens.size === 0 || listingTokens.size === 0) return 0;

  let intersection = 0;
  for (const token of userTokens) {
    if (listingTokens.has(token)) intersection++;
  }

  // Jaccard-like similarity
  const union = userTokens.size + listingTokens.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// ─── Main Match Function ──────────────────────────────────────

export type UserListingSummary = {
  title: string;
  description: string;
  seekingDescription: string | null;
  category: string;
};

export type OtherListingSummary = {
  id: number;
  title: string;
  description: string;
  seekingDescription: string | null;
  category: string;
};

export type FindMatchesResult = {
  matchedIds: number[];
  scores: Map<number, number>;
};

/**
 * Build a combined profile text from all of a user's listings.
 */
function buildUserProfileText(listings: UserListingSummary[]): string {
  return listings
    .map(
      (l) =>
        [l.title, l.description, l.category, l.seekingDescription ?? ""]
          .filter(Boolean)
          .join(" "),
    )
    .join(" ");
}

/**
 * Build a combined text for a single listing embedding.
 */
function buildListingText(listing: OtherListingSummary): string {
  return [listing.title, listing.description, listing.category, listing.seekingDescription ?? ""]
    .filter(Boolean)
    .join(" ");
}

/**
 * Fallback keyword-based matching when NVIDIA isn't available.
 */
function fallbackKeywordMatch(
  userText: string,
  otherListings: OtherListingSummary[],
): FindMatchesResult {
  const scored = otherListings
    .map((listing) => {
      const listingText = buildListingText(listing);
      const score = textOverlapScore(userText, listingText);
      return { id: listing.id, score };
    })
    .filter((s) => s.score >= 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return {
    matchedIds: scored.map((s) => s.id),
    scores: new Map(scored.map((s) => [s.id, s.score])),
  };
}

/**
 * Find the top 10 best matches for a user's listings against other available listings
 * using NVIDIA embedding-based semantic similarity (nv-embed-qa-4).
 *
 * - Combines all user listings into a single profile text → generates a query embedding
 * - For each other listing, generates a passage embedding (cached with 1-hour TTL)
 * - Computes cosine similarity between user embedding and each listing embedding
 * - Returns top 10 results with scores >= 0.35
 * - Falls back to keyword overlap scoring if NVIDIA is unavailable
 */
/**
 * Type for a listing summary used in similarity matching.
 */
export type SimilarListingInput = {
  id: number;
  title: string;
  description: string;
  seekingDescription: string | null;
  category: string;
};

/**
 * Find listings that are semantically similar to a given listing.
 * Uses the same NVIDIA embedding pipeline as findMatches but takes a single
 * listing as the query instead of combining all user listings.
 *
 * Useful for "Suggested Swaps" on the listing detail page.
 *
 * @returns array of { id, score } sorted by similarity descending, filtered >= 0.50
 */
export async function findSimilarListings(
  listing: SimilarListingInput,
  candidates: SimilarListingInput[],
  maxResults: number = 4,
): Promise<Array<{ id: number; score: number }>> {
  const queryText = buildListingText(listing);

  if (!queryText.trim() || candidates.length === 0) {
    return [];
  }

  try {
    const queryEmbedding = await getEmbedding(queryText, "query");

    const similarities = await Promise.all(
      candidates.map(async (candidate) => {
        const cacheKey = `listingId:${candidate.id}`;
        let embedding = getCachedEmbedding(cacheKey);

        if (!embedding) {
          const candidateText = buildListingText(candidate);
          embedding = await getEmbedding(candidateText, "passage");
          setCachedEmbedding(cacheKey, embedding);
        }

        const score = cosineSimilarity(queryEmbedding, embedding);
        return { id: candidate.id, score };
      }),
    );

    return similarities
      .filter((s) => s.score >= 0.35)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  } catch (error) {
    console.error(
      "NVIDIA embedding failed for similar listings, falling back to keyword scoring:",
      error,
    );
    // Fallback: text overlap
    const scored = candidates
      .map((c) => ({ id: c.id, score: textOverlapScore(queryText, buildListingText(c)) }))
      .filter((s) => s.score >= 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
    return scored;
  }
}

export async function findMatches(
  userId: string,
  userListings: UserListingSummary[],
  otherListings: OtherListingSummary[],
): Promise<FindMatchesResult> {
  const userText = buildUserProfileText(userListings);

  if (!userText.trim() || otherListings.length === 0) {
    return { matchedIds: [], scores: new Map() };
  }

  // Try NVIDIA embeddings first
  try {
    const userEmbedding = await getEmbedding(userText, "query");

    // Process other listings in parallel (with caching)
    const similarities = await Promise.all(
      otherListings.map(async (listing) => {
        const cacheKey = `listingId:${listing.id}`;
        let embedding = getCachedEmbedding(cacheKey);

        if (!embedding) {
          const listingText = buildListingText(listing);
          embedding = await getEmbedding(listingText, "passage");
          setCachedEmbedding(cacheKey, embedding);
        }

        const score = cosineSimilarity(userEmbedding, embedding);
        return { id: listing.id, score };
      }),
    );

    // Sort by score descending, filter >= 0.35, take top 10
    const scored = similarities
      .filter((s) => s.score >= 0.35)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const matchedIds = scored.map((s) => s.id);
    const scores = new Map<number, number>(
      scored.map((s) => [s.id, s.score]),
    );

    return { matchedIds, scores };
  } catch (error) {
    console.error(
      "NVIDIA embedding failed, falling back to keyword scoring:",
      error,
    );
    return fallbackKeywordMatch(userText, otherListings);
  }
}
