import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Lightbulb,
  Loader2,
  Menu,
  RotateCcw,
  Sparkles,
  Target,
  X,
  Zap,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type Lesson = {
  title: string;
  level: string;
  summary: string;
  explanation: string;
  example: string;
  keyTakeaway: string;
  studyTip: string;
  quiz: Array<{
    question: string;
    options: string[];
    answerIndex: number;
    rationale: string;
  }>;
};

type LessonResult = { lesson: Lesson; source: "ai" | "fallback" };

const prompts = [
  "Why do leaves look green?",
  "Explain opportunity cost",
  "How does a vaccine work?",
];

function Mark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-mark ${compact ? "brand-mark-compact" : ""}`} aria-label="LearnLoop logo">
      <span className="brand-orbit brand-orbit-one" />
      <span className="brand-orbit brand-orbit-two" />
      <span className="brand-dot" />
    </div>
  );
}

function SectionLabel({ number, children }: { number: string; children: string }) {
  return (
    <div className="section-label">
      <span>{number}</span>
      <div />
      <strong>{children}</strong>
    </div>
  );
}

function QuizCard({ item, index }: { item: Lesson["quiz"][number]; index: number }) {
  const [selected, setSelected] = useState<number | null>(null);
  const checked = selected !== null;
  const isCorrect = selected === item.answerIndex;

  return (
    <article className="quiz-card">
      <div className="quiz-card-top">
        <span className="quiz-number">0{index + 1}</span>
        <span className="quiz-check-label">Quick check</span>
      </div>
      <h4>{item.question}</h4>
      <div className="quiz-options" role="radiogroup" aria-label={item.question}>
        {item.options.map((option, optionIndex) => {
          const isAnswer = optionIndex === item.answerIndex;
          const isSelected = optionIndex === selected;
          return (
            <button
              key={option}
              type="button"
              className={`quiz-option ${isSelected ? "is-selected" : ""} ${checked && isAnswer ? "is-answer" : ""} ${checked && isSelected && !isCorrect ? "is-wrong" : ""}`}
              onClick={() => setSelected(optionIndex)}
              role="radio"
              aria-checked={isSelected}
            >
              <span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span>
              <span>{option}</span>
              {checked && isAnswer ? <Check size={16} aria-label="Correct answer" /> : null}
              {checked && isSelected && !isCorrect ? <X size={16} aria-label="Incorrect answer" /> : null}
            </button>
          );
        })}
      </div>
      {checked ? (
        <div className={`quiz-feedback ${isCorrect ? "feedback-correct" : "feedback-try"}`}>
          <strong>{isCorrect ? "That’s it." : `The best answer is ${String.fromCharCode(65 + item.answerIndex)}.`}</strong>
          <span>{item.rationale}</span>
        </div>
      ) : (
        <p className="quiz-hint">Choose an answer to reveal the reasoning.</p>
      )}
    </article>
  );
}

function LessonPanel({ result }: { result: LessonResult }) {
  const [showAll, setShowAll] = useState(false);
  const quiz = showAll ? result.lesson.quiz : result.lesson.quiz.slice(0, 2);

  return (
    <section className="lesson-panel" id="lesson" aria-live="polite">
      <div className="lesson-header">
        <div>
          <div className="lesson-kicker">
            <span className="status-dot" />
            {result.source === "ai" ? "Personalised by AI" : "Offline learning card"}
          </div>
          <h2>{result.lesson.title}</h2>
          <p>{result.lesson.summary}</p>
        </div>
        <span className="level-chip">{result.lesson.level}</span>
      </div>

      {result.source === "fallback" ? (
        <div className="fallback-note">
          <Zap size={17} />
          <span>AI is taking a breather. This ready-to-use lesson keeps your learning loop moving.</span>
        </div>
      ) : null}

      <div className="lesson-grid">
        <article className="lesson-copy-card lesson-explanation">
          <div className="card-icon"><BookOpen size={18} /></div>
          <span className="eyebrow">The idea</span>
          <h3>Make it make sense</h3>
          <p>{result.lesson.explanation}</p>
        </article>
        <article className="lesson-copy-card lesson-example">
          <div className="card-icon"><Target size={18} /></div>
          <span className="eyebrow">In the world</span>
          <h3>See it in context</h3>
          <p>{result.lesson.example}</p>
        </article>
      </div>

      <div className="takeaway-strip">
        <div className="takeaway-icon"><Lightbulb size={19} /></div>
        <div><span className="eyebrow">Keep this</span><strong>{result.lesson.keyTakeaway}</strong></div>
      </div>

      <div className="quiz-heading">
        <div>
          <span className="eyebrow">Practice, not pressure</span>
          <h3>Try a quick check</h3>
        </div>
        <span className="quiz-count">{result.lesson.quiz.length} questions</span>
      </div>
      <div className="quiz-list">
        {quiz.map((item, index) => <QuizCard key={`${item.question}-${index}`} item={item} index={index} />)}
      </div>
      {result.lesson.quiz.length > 2 ? (
        <button type="button" className="show-more" onClick={() => setShowAll(value => !value)}>
          {showAll ? "Show fewer questions" : "Show the last question"} <ChevronRight size={16} className={showAll ? "rotate-90" : ""} />
        </button>
      ) : null}

      <div className="study-tip">
        <Sparkles size={17} />
        <div><span className="eyebrow">Your next two minutes</span><p>{result.lesson.studyTip}</p></div>
      </div>
    </section>
  );
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [inputError, setInputError] = useState("");
  const [lessonResult, setLessonResult] = useState<LessonResult | null>(null);
  const [networkError, setNetworkError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const tutorMutation = trpc.tutor.generate.useMutation({
    onSuccess: data => {
      setLessonResult(data);
      setNetworkError("");
      window.setTimeout(() => document.getElementById("lesson")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    },
    onError: () => setNetworkError("We couldn’t reach the tutor just now. Your question is still here — try again in a moment."),
  });

  const isWorking = tutorMutation.isPending;
  const canSubmit = question.trim().length >= 3 && !isWorking;
  const progress = useMemo(() => lessonResult ? 72 : 18, [lessonResult]);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submitQuestion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanQuestion = question.trim();
    if (cleanQuestion.length < 3) {
      setInputError("Give us a little more to work with — a topic or question is perfect.");
      return;
    }
    setInputError("");
    setNetworkError("");
    tutorMutation.mutate({ prompt: cleanQuestion });
  };

  const retryQuestion = () => {
    const cleanQuestion = question.trim();
    if (cleanQuestion.length < 3 || isWorking) return;
    setNetworkError("");
    tutorMutation.mutate({ prompt: cleanQuestion });
  };

  const usePrompt = (prompt: string) => {
    setQuestion(prompt);
    setInputError("");
    scrollTo("tutor");
  };

  return (
    <div className="learnloop-app">
      <header className="site-header">
        <button className="wordmark" onClick={() => scrollTo("top")} aria-label="Back to top">
          <Mark compact />
          <span>learn<span>loop</span></span>
        </button>
        <nav id="primary-nav" className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
          <button onClick={() => scrollTo("how-it-works")}>How it works</button>
          <button onClick={() => scrollTo("impact")}>Our impact</button>
          <button className="nav-cta" onClick={() => scrollTo("tutor")}>Open the tutor <ArrowRight size={15} /></button>
        </nav>
        <button className="menu-toggle" onClick={() => setMenuOpen(value => !value)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="primary-nav">
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <div className="pill-label"><span className="pill-spark">✦</span> AI study support for curious minds</div>
            <h1>Make your next <em>aha</em> moment easier.</h1>
            <p className="hero-lede">LearnLoop turns the question in your head into a clear explanation, a real-world connection, and a small next step.</p>
            <div className="hero-actions">
              <Button className="primary-action" onClick={() => scrollTo("tutor")}>Bring a question <ArrowDown size={16} /></Button>
              <button className="text-action" onClick={() => scrollTo("how-it-works")}>See how it works <ArrowRight size={16} /></button>
            </div>
            <div className="hero-proof"><div className="avatar-stack"><span>AM</span><span>RK</span><span>JL</span></div><span>Built for self-directed learning<br /><strong>and the people who support it.</strong></span></div>
          </div>
          <div className="hero-visual" aria-label="A visual summary of the LearnLoop learning loop">
            <div className="orbit orbit-large" /><div className="orbit orbit-small" />
            <div className="visual-label visual-label-top"><Sparkles size={15} /> ASK</div>
            <div className="visual-label visual-label-right"><Lightbulb size={15} /> CONNECT</div>
            <div className="visual-label visual-label-bottom"><Check size={15} /> APPLY</div>
            <div className="lesson-orb"><div className="orb-inner"><Mark /><span className="orb-caption">YOUR LEARNING<br /><strong>LOOP</strong></span></div></div>
            <div className="floating-card floating-card-one"><span className="mini-label">TODAY’S SIGNAL</span><strong>One useful<br />idea at a time.</strong><div className="signal-line"><span style={{ width: "74%" }} /></div></div>
            <div className="floating-card floating-card-two"><span className="mini-label">NEXT STEP</span><strong>Explain it<br />back to yourself.</strong><ArrowRight size={16} /></div>
          </div>
        </section>

        <section className="trust-strip" aria-label="LearnLoop principles">
          <span>Designed around SDG 4</span><div /><span>Clear over clever</span><div /><span>Progress over perfection</span><div /><span>Curiosity is welcome here</span>
        </section>

        <section className="how-section content-section" id="how-it-works">
          <div className="section-intro"><SectionLabel number="01" >HOW IT WORKS</SectionLabel><h2>Learning should feel like a <span>conversation,</span> not a test.</h2></div>
          <div className="steps-row">
            <article className="step-card"><span className="step-number">01</span><div className="step-icon step-icon-lime"><CircleHelp size={22} /></div><h3>Bring the question</h3><p>Start exactly where you are. No perfect wording, no prerequisites, no gatekeeping.</p></article>
            <div className="step-line" />
            <article className="step-card"><span className="step-number">02</span><div className="step-icon step-icon-coral"><Sparkles size={22} /></div><h3>Get a clearer view</h3><p>AI meets you at your level with an explanation, an example, and language you can use.</p></article>
            <div className="step-line" />
            <article className="step-card"><span className="step-number">03</span><div className="step-icon step-icon-blue"><Zap size={22} /></div><h3>Make it yours</h3><p>Try a quick check, teach it back, and leave with a next move that sticks.</p></article>
          </div>
        </section>

        <section className="tutor-section" id="tutor">
          <div className="tutor-heading"><SectionLabel number="02">THE TUTOR</SectionLabel><h2>Bring the question<br /><em>you’re carrying.</em></h2><p>Ask about anything you’re learning. We’ll keep the answer human-sized.</p></div>
          <div className="tutor-card">
            <div className="tutor-card-top"><div className="live-indicator"><span /> LEARNLOOP AI IS READY</div><span className="session-note">No account needed · private by design</span></div>
            <form onSubmit={submitQuestion}>
              <label htmlFor="question" className="question-label">What would you like to understand?</label>
              <div className={`question-input-wrap ${inputError ? "has-error" : ""}`}><textarea id="question" value={question} onChange={event => { setQuestion(event.target.value); setInputError(""); }} placeholder="e.g. Why does the moon have phases?" rows={3} maxLength={300} /><span className="character-count">{question.length}/300</span></div>
              {inputError ? <p className="form-message form-error" role="alert">{inputError}</p> : null}
              {networkError ? <div className="form-message form-error network-error" role="alert"><span>{networkError}</span><button type="button" onClick={retryQuestion} disabled={isWorking}><RotateCcw size={13} /> Retry</button></div> : null}
              <div className="prompt-row"><span>Try one of these</span>{prompts.map(prompt => <button type="button" key={prompt} onClick={() => usePrompt(prompt)}>{prompt}</button>)}</div>
              <div className="submit-row"><span>Explanations are generated on the server with managed AI.</span><Button type="submit" className="submit-button" disabled={!canSubmit}>{isWorking ? <><Loader2 size={16} className="spin" /> Thinking…</> : <>Build my learning card <ArrowRight size={16} /></>}</Button></div>
            </form>
          </div>
        </section>

        {lessonResult ? <LessonPanel result={lessonResult} /> : (
          <section className="empty-lesson"><div className="empty-lesson-mark"><Mark /></div><div><span className="eyebrow">YOUR SPACE TO LEARN</span><h3>Your first learning card<br /><em>starts with a question.</em></h3><p>Nothing to prepare. Ask above and your explanation will land here.</p></div></section>
        )}

        <section className="impact-section content-section" id="impact">
          <div className="impact-statement"><SectionLabel number="03">WHY IT MATTERS</SectionLabel><h2>Quality education is a <span>door,</span> not a destination.</h2><p>SDG 4 calls for inclusive, equitable quality education and lifelong learning opportunities for all. LearnLoop focuses on one practical piece of that promise: making it easier for anyone to keep learning, wherever they are starting from.</p><Button className="impact-button" onClick={() => scrollTo("tutor")}>Keep learning <ArrowRight size={16} /></Button></div>
          <div className="impact-stat-card"><div className="stat-quote">“</div><p>When the next step is clear, curiosity has somewhere to go.</p><div className="impact-rule" /><span>THE LEARNLOOP PRINCIPLE</span></div>
        </section>

        <section className="footer-cta"><div><span className="eyebrow">A SMALL PROMPT FOR TODAY</span><h2>What’s one thing<br /><em>you want to understand?</em></h2></div><button onClick={() => scrollTo("tutor")} className="circle-arrow" aria-label="Open the tutor"><ArrowRight size={26} /></button></section>
      </main>
      <footer className="site-footer"><div className="footer-brand"><Mark compact /><span>learn<span>loop</span></span></div><span>Made for the next question. Aligned with SDG 4.</span><span>© 2026 LearnLoop AI</span></footer>
    </div>
  );
}
