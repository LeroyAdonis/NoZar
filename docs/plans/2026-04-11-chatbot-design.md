Chatbot Design Document

Summary
- Purpose: Add an AI-powered chatbot for trade negotiation, chat summaries, and meetup suggestions using NVIDIA inference API. Feature-flagged via ENABLE_CHATBOT.

Architecture
- Frontend: new Chat UI components under app/components/Chat and route app/routes/dashboard/chat.$tradeId.tsx.
- Backend: new API endpoints under app/routes (api.chat.ts, api.handshake.$tradeId.ts, api.meetup.$tradeId.ts).
- Services: app/lib/nvidia.server.ts (API proxy), app/lib/chat.server.ts (orchestration), optional handshake/meetup services.
- DB: add chat_sessions & chat_messages tables (drizzle schema) for persistent sessions.

Security & Ops
- NVIDIA_API_KEY stored in .env.local; do not commit real keys. Use rate limits, retries, and feature flags.

Testing
- Unit tests for nvidia.server and chat.server. Integration tests for /api/chat (mock NVIDIA via nock/msw). E2E for chat UI with mocked streaming.

Rollout
- Feature flag ENABLE_CHATBOT, staff allowlist, gradual rollout with monitoring.