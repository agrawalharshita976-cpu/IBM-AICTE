# LearnLoop AI

LearnLoop AI is a responsive AI study companion aligned with **UN Sustainable Development Goal 4: Quality Education**. Learners can ask a question and receive an explanation, a practical example, a key takeaway, a study tip, and a short practice quiz.

## Run locally

Requirements: Node.js 20+ and pnpm 10+.

```bash
cd learnloop
pnpm install
pnpm dev
```

Open `http://localhost:3000` in your browser. The app listens on `0.0.0.0` and respects the `PORT` environment variable:

```bash
PORT=3000 pnpm dev
```

The project uses the managed Manus LLM service through `server/_core/llm.ts`. In the managed Manus Preview, the required runtime credentials are injected automatically. For a standalone local machine, provide the platform runtime variables required by your deployment environment; do not put secrets in browser code.

## Validate and build

```bash
pnpm check       # TypeScript validation
pnpm test        # Vitest test suite, if present
pnpm build       # Vite client + bundled Express server
pnpm start       # Serve the production bundle
```

The health endpoint is available at `http://localhost:3000/api/health`.

## Project map

- `client/src/pages/Home.tsx` — landing page, tutor form, learning card, quiz interactions.
- `client/src/index.css` — responsive LearnLoop editorial learning-lab design system.
- `server/routers.ts` — validated `tutor.generate` procedure with structured AI response parsing and offline fallback.
- `server/_core/llm.ts` — server-only managed LLM transport.
- `public/manus-routes.json` — managed runtime route declaration.
- `plan.md` — implementation and design decisions.
- `TODO.md` — acceptance outcomes.

## AI behavior

The server discovers an available managed model at request time, asks for structured JSON, validates the response, and retries once without a response format if needed. If the AI service is unavailable or returns unusable content, the API returns a clearly labeled offline lesson so the learner can still continue.
