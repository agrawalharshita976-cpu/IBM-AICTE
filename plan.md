# LearnLoop AI — implementation plan

## Product scope

LearnLoop AI is a complete responsive AI study companion aligned with **UN Sustainable Development Goal 4: Quality Education**. A learner enters a topic or question and receives an understandable explanation, a practical real-world example, and a short practice quiz with answers. The product has a public landing experience, a tutor workspace, explicit SDG 4 impact messaging, accessible interactions, and a deterministic fallback lesson when the managed AI service is unavailable.

## Architecture

- **Frontend:** React + TypeScript + Wouter + Tailwind CSS in `client/src`.
- **Backend:** Express + tRPC in `server`; the `tutor.generate` public mutation validates input and invokes the managed server-side LLM helper.
- **AI:** `listLLMModels` selects an available model at runtime, then `invokeLLM` requests a structured JSON learning response. The server validates and normalizes the response and falls back to a local lesson when the AI service or response shape is unavailable.
- **Persistence:** No learner account or database record is required for this MVP; the session state lives in the browser, which keeps the public learning flow frictionless.
- **Serving:** The existing server listens on port 3000, serves `/api/health`, tRPC at `/api/trpc`, and the Vite-built client. `public/manus-routes.json` declares the page routes.

## Project structure

- `client/src/pages/Home.tsx`: landing page, impact story, tutor workspace, examples, and local quiz interaction.
- `client/src/index.css`: LearnLoop visual system, responsive layout, custom components, and motion.
- `server/routers.ts`: validated `tutor.generate` endpoint plus starter auth/system routers.
- `server/_core/llm.ts`: managed platform LLM transport, reused without exposing credentials to the browser.
- `public/manus-routes.json`: route manifest for the managed preview/publishing layer.
- `app.config.ts`: platform project logo metadata.
- `plan.md` and `TODO.md`: implementation record and acceptance outcomes.

## Design direction

- **Design movement:** editorial learning lab — warm Swiss typography and information design blended with optimistic civic-tech cues.
- **Core principles:** reduce intimidation, make progress visible, pair calm whitespace with high-signal color, and keep every action learner-directed.
- **Color philosophy:** a deep ink navy signals trust and focus; “Loop Lime” is the ownable signature color that brings energy to small wins; coral marks examples and human warmth; parchment backgrounds keep long-form reading gentle.
- **Layout paradigm:** a left-anchored editorial canvas with an offset hero diagram and overlapping lesson cards; sections flow as a guided narrative rather than a centered marketing grid.
- **Signature elements:** the Loop Lime orbital mark, oversized section numerals, and slim “learning signal” rules that connect labels to content.
- **Interaction philosophy:** learners get immediate feedback, preserved input on failure, one obvious primary action, and quiz answers that reveal rationale rather than only a score.
- **Animation:** short 180–260ms ease-out fades and lifts; subtle orbital rotation on the logo; no distracting continuous motion in the tutor workspace.
- **Typography:** `Manrope` for interface labels and body copy, `DM Sans` for display headlines; strong weight contrast, generous line-height, and tabular numerals for impact stats.
- **Brand essence:** “A clearer next step for every curious mind.” For self-directed learners and educators. Personality: clear, generous, quietly bold.
- **Brand voice:** encouraging, concrete, never patronizing. Example lines: “Bring the question you’re carrying.” and “One idea at a time, made easier to use.”
- **Wordmark/logo:** a compact orbital loop made of two offset arcs with a lime dot, paired with the LearnLoop wordmark.
- **Signature brand color:** Loop Lime `#C8F36A`.

## Required behavior

1. Landing page communicates the SDG 4 mission and opens the tutor workspace.
2. Tutor validates a non-empty question, shows loading state, calls the server-side AI mutation, and renders title, explanation, example, key takeaway, study tip, and quiz.
3. Quiz interactions reveal correctness and rationale without requiring another network call.
4. AI errors, malformed responses, and empty results preserve learner input and show the offline fallback lesson.
5. The interface is keyboard usable, responsive, readable, and does not expose server credentials.
6. The server remains runnable with `pnpm dev`, passes `pnpm check`, and the production build passes `pnpm build`.
