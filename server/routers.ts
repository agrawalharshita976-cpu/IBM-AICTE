import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM, listLLMModels } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

type QuizItem = {
  question: string;
  options: string[];
  answerIndex: number;
  rationale: string;
};

type TutorLesson = {
  title: string;
  level: string;
  summary: string;
  explanation: string;
  example: string;
  keyTakeaway: string;
  studyTip: string;
  quiz: QuizItem[];
};

const lessonSchema = {
  name: "learnloop_lesson",
  strict: true,
  schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      level: { type: "string" },
      summary: { type: "string" },
      explanation: { type: "string" },
      example: { type: "string" },
      keyTakeaway: { type: "string" },
      studyTip: { type: "string" },
      quiz: {
        type: "array",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            options: { type: "array", items: { type: "string" } },
            answerIndex: { type: "integer" },
            rationale: { type: "string" },
          },
          required: ["question", "options", "answerIndex", "rationale"],
          additionalProperties: false,
        },
      },
    },
    required: [
      "title",
      "level",
      "summary",
      "explanation",
      "example",
      "keyTakeaway",
      "studyTip",
      "quiz",
    ],
    additionalProperties: false,
  },
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const textValue = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function normalizeLesson(value: unknown, prompt: string): TutorLesson | null {
  if (!isRecord(value)) return null;

  const rawQuiz = Array.isArray(value.quiz) ? value.quiz : [];
  const quiz = rawQuiz
    .filter(isRecord)
    .slice(0, 3)
    .map(item => {
      const options = Array.isArray(item.options)
        ? item.options.filter((option): option is string => typeof option === "string").slice(0, 4)
        : [];
      const answerIndex = Number(item.answerIndex);
      return {
        question: textValue(item.question),
        options,
        answerIndex,
        rationale: textValue(item.rationale),
      };
    })
    .filter(
      item =>
        item.question.length > 0 &&
        item.options.length >= 2 &&
        Number.isInteger(item.answerIndex) &&
        item.answerIndex >= 0 &&
        item.answerIndex < item.options.length &&
        item.rationale.length > 0
    );

  const lesson: TutorLesson = {
    title: textValue(value.title) || `A clearer look at ${prompt}`,
    level: textValue(value.level) || "Starting point",
    summary: textValue(value.summary),
    explanation: textValue(value.explanation),
    example: textValue(value.example),
    keyTakeaway: textValue(value.keyTakeaway),
    studyTip: textValue(value.studyTip),
    quiz,
  };

  if (
    !lesson.summary ||
    !lesson.explanation ||
    !lesson.example ||
    !lesson.keyTakeaway ||
    !lesson.studyTip ||
    lesson.quiz.length < 2
  ) {
    return null;
  }

  return lesson;
}

function fallbackLesson(prompt: string): TutorLesson {
  const topic = prompt.replace(/[?.!]+$/, "").trim();
  return {
    title: `A clear starting point for ${topic}`,
    level: "Offline lesson",
    summary: `Let’s make ${topic} feel smaller by connecting it to something familiar and useful.`,
    explanation: `${topic} is easier to learn when you first name the main idea, then notice how its parts work together. Start with one plain-language definition, look for a real situation where the idea appears, and explain it back in your own words. That cycle turns a new fact into understanding you can use.`,
    example: `Imagine a learner explaining ${topic} to a friend using a simple everyday comparison. The friend asks “why?” and the learner adds one reason and one example. That small conversation is already practice: it makes the idea concrete and reveals which part needs another look.`,
    keyTakeaway: `Learn ${topic} in a loop: define it, connect it to a real example, then explain it back.`,
    studyTip: "Try the 2-minute teach-back: close your notes and describe the idea as if you were helping someone one step behind you.",
    quiz: [
      {
        question: "Which learning move usually makes a new idea more useful?",
        options: ["Memorising every word first", "Connecting it to a real example", "Skipping the why", "Waiting until you feel perfect"],
        answerIndex: 1,
        rationale: "A real example gives an abstract idea somewhere to land, making it easier to remember and apply.",
      },
      {
        question: "What is a helpful way to check your understanding?",
        options: ["Teach the idea back in your own words", "Read the same sentence silently", "Hide the confusing part", "Only look at the title"],
        answerIndex: 0,
        rationale: "A teach-back surfaces what you understand and what still needs a clearer explanation.",
      },
      {
        question: "What should you do when a topic feels too large?",
        options: ["Break it into one smaller question", "Give up immediately", "Add more tabs", "Only copy a definition"],
        answerIndex: 0,
        rationale: "Smaller questions create a manageable next step and keep learning momentum alive.",
      },
    ],
  };
}

const systemPrompt = `You are LearnLoop, a patient and precise study companion supporting SDG 4: Quality Education. Teach the learner's requested topic without assuming prior expertise. Return ONLY valid JSON matching the requested schema. Use plain English, short paragraphs, and concrete language. Avoid jargon unless you define it. The quiz must test the explanation, not trivia. Do not use markdown, citations, or claims that require browsing.`;

async function generateLesson(prompt: string): Promise<TutorLesson> {
  const models = await listLLMModels();
  const model =
    models.data.find(item => item.id.startsWith("gpt-5-mini"))?.id ??
    models.data.find(item => item.id.startsWith("gpt-5"))?.id ??
    models.data[0]?.id;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    {
      role: "user" as const,
      content: `Create a learning card for this learner question: "${prompt}". Include a concise title, approximate level, one-sentence summary, a 2–3 paragraph explanation, one practical example, one key takeaway, one study tip, and exactly three multiple-choice quiz questions with 3–4 options each. answerIndex must be zero-based.`,
    },
  ];

  const response = await invokeLLM({
    model,
    messages,
    responseFormat: { type: "json_schema", json_schema: lessonSchema },
  });
  const content = response.choices?.[0]?.message?.content;
  const text = Array.isArray(content)
    ? content
        .filter(part => part.type === "text")
        .map(part => part.text)
        .join("\n")
    : content;
  const parsed = typeof text === "string" ? extractJson(text) : null;
  const lesson = normalizeLesson(parsed, prompt);
  if (lesson) return lesson;

  const retry = await invokeLLM({ model, messages });
  const retryContent = retry.choices?.[0]?.message?.content;
  const retryText = Array.isArray(retryContent)
    ? retryContent
        .filter(part => part.type === "text")
        .map(part => part.text)
        .join("\n")
    : retryContent;
  const retryLesson = normalizeLesson(
    typeof retryText === "string" ? extractJson(retryText) : null,
    prompt
  );
  if (!retryLesson) throw new Error("The AI returned an incomplete lesson");
  return retryLesson;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  tutor: router({
    generate: publicProcedure
      .input(z.object({ prompt: z.string().trim().min(3).max(300) }))
      .mutation(async ({ input }) => {
        try {
          const lesson = await generateLesson(input.prompt);
          return { lesson, source: "ai" as const };
        } catch (error) {
          console.warn("[Tutor] Falling back to offline lesson:", error);
          return {
            lesson: fallbackLesson(input.prompt),
            source: "fallback" as const,
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
