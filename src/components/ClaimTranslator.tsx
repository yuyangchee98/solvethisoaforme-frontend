import { useRef, useState } from 'react';
import { Client } from '@gradio/client';
import { Check, Copy, Loader2, Square } from 'lucide-react';
import { TRANSLATOR_EXAMPLES } from '@/lib/translatorExamples';
import { Button } from './ui/button';

// The model runs in a Hugging Face Space on shared ZeroGPU hardware. The browser talks to it
// directly, so this site never sees the claims, and each visitor's runs count against their own
// anonymous daily GPU allowance rather than anyone's account.
const SPACE = 'yuyangchee98/jp-us-claims-translator';
const SPACE_URL = 'https://huggingface.co/spaces/yuyangchee98/jp-us-claims-translator';
const MAX_CHARS = 4000; // the Space rejects longer input

type Phase = 'idle' | 'connecting' | 'starting' | 'queued' | 'translating' | 'done' | 'stopped' | 'error';

const BUSY: Phase[] = ['connecting', 'starting', 'queued', 'translating'];

export default function ClaimTranslator() {
  const [exampleIndex, setExampleIndex] = useState(0);
  const [text, setText] = useState(TRANSLATOR_EXAMPLES[0].jpClaims);
  const [output, setOutput] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [detail, setDetail] = useState('');
  const [copied, setCopied] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const jobRef = useRef<{ cancel: () => Promise<void> } | null>(null);

  const busy = BUSY.includes(phase);
  const tooLong = text.length > MAX_CHARS;
  // The comparison only makes sense while the textarea still holds the example unedited.
  const example = TRANSLATOR_EXAMPLES[exampleIndex]?.jpClaims === text ? TRANSLATOR_EXAMPLES[exampleIndex] : null;
  const claimCount = output ? (output.match(/^\d+\.\s/gm) ?? []).length : 0;

  async function connect(): Promise<Client> {
    if (clientRef.current) return clientRef.current;
    setPhase('connecting');
    const client = await Client.connect(SPACE, {
      status_callback: (s) => {
        // A Space that has had no visitors for a while is asleep and has to load the model again.
        if (s.status === 'sleeping' || s.status === 'building' || s.status === 'starting') setPhase('starting');
      },
    });
    clientRef.current = client;
    return client;
  }

  async function translate() {
    if (!text.trim() || tooLong || busy) return;
    setOutput('');
    setDetail('');
    setCopied(false);
    try {
      const client = await connect();
      setPhase('queued');
      const job = client.submit('/translate', { jp_text: text });
      jobRef.current = job;
      for await (const msg of job) {
        if (msg.type === 'status') {
          if (msg.stage === 'error') throw new Error(msg.message || 'The translation failed. Try again in a moment.');
          if (msg.stage === 'pending' && msg.queue) {
            setPhase('queued');
            setDetail(typeof msg.position === 'number' ? `position ${msg.position + 1}` : '');
          }
        } else if (msg.type === 'data') {
          setPhase('translating');
          setDetail('');
          setOutput(String(msg.data[0] ?? ''));
        }
      }
      setPhase((p) => (p === 'stopped' ? p : 'done'));
    } catch (e) {
      setPhase('error');
      setDetail(e instanceof Error ? e.message : String(e));
      clientRef.current = null; // reconnect on the next attempt
    } finally {
      jobRef.current = null;
    }
  }

  async function stop() {
    setPhase('stopped');
    await jobRef.current?.cancel();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function chooseExample(value: string) {
    const i = Number(value);
    setExampleIndex(i);
    setText(TRANSLATOR_EXAMPLES[i].jpClaims);
    setOutput('');
    setPhase('idle');
    setDetail('');
  }

  const status: Record<Phase, string> = {
    idle: '',
    connecting: 'Connecting…',
    starting: 'Starting the model. After a quiet period this takes about two minutes.',
    queued: `Waiting for a GPU${detail ? ` (${detail})` : ''}…`,
    translating: 'Translating…',
    done: `Done. ${claimCount} ${claimCount === 1 ? 'claim' : 'claims'}.`,
    stopped: 'Stopped.',
    error: detail,
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 md:py-14">
      <header className="mb-8 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">Japanese Patent Claim Translator</h1>
        <p className="mt-3 text-base text-stone-500 leading-relaxed">
          Translates the claims of a Japanese patent application into English, in the form used for US filings.
          Claims that depend on several earlier claims are rewritten to depend on one. The output is a draft for
          review by a patent professional.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col rounded-xl border border-stone-200 bg-white p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <label htmlFor="jp-claims" className="text-sm font-semibold text-stone-900">
              Japanese claims
            </label>
            <select
              id="example"
              aria-label="Example"
              value={example ? String(exampleIndex) : ''}
              onChange={(e) => chooseExample(e.target.value)}
              disabled={busy}
              className="max-w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              {!example && <option value="">Your own claims</option>}
              {TRANSLATOR_EXAMPLES.map((ex, i) => (
                <option key={ex.jpPublication} value={i}>
                  Example: {ex.title} ({ex.jpPublication})
                </option>
              ))}
            </select>
          </div>
          <textarea
            id="jp-claims"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
            rows={18}
            spellCheck={false}
            placeholder={'【請求項1】…\n【請求項2】請求項1に記載の…'}
            className="min-h-[24rem] w-full flex-1 resize-y rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm leading-relaxed text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-70"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className={`text-xs tabular-nums ${tooLong ? 'text-red-600' : 'text-stone-400'}`}>
              {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
            </span>
            {busy ? (
              <Button type="button" variant="outline" onClick={stop} disabled={phase === 'connecting' || phase === 'starting'}>
                <Square /> Stop
              </Button>
            ) : (
              <Button type="button" onClick={translate} disabled={!text.trim() || tooLong}>
                Translate
              </Button>
            )}
          </div>
        </section>

        <section className="flex flex-col rounded-xl border border-stone-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-stone-900">English claims</h2>
            <Button type="button" variant="ghost" size="sm" onClick={copy} disabled={!output || busy}>
              {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <div className="min-h-[24rem] flex-1 overflow-auto whitespace-pre-wrap rounded-lg border border-stone-100 bg-stone-50 p-3 text-sm leading-relaxed text-stone-800">
            {output || <span className="text-stone-400">The translation appears here.</span>}
          </div>
          <p
            role="status"
            aria-live="polite"
            className={`mt-3 flex min-h-5 items-center gap-2 text-xs ${phase === 'error' ? 'text-red-600' : 'text-stone-500'}`}
          >
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            {status[phase]}
          </p>
        </section>
      </div>

      {example && (
        <details className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
          <summary className="cursor-pointer text-sm font-semibold text-stone-900">
            US claims as filed for this example ({example.usPublication})
          </summary>
          {example.usClaimCount > example.jpClaimCount && (
            <p className="mt-3 text-sm text-stone-500">
              Counsel filed {example.usClaimCount} US claims for these {example.jpClaimCount} Japanese claims. The
              added claims have no counterpart in the Japanese text, so no translation would include them.
            </p>
          )}
          <div className="mt-3 whitespace-pre-wrap rounded-lg bg-stone-50 p-3 text-sm leading-relaxed text-stone-700">
            {example.usClaimsAsFiled}
          </div>
        </details>
      )}

      <p className="mt-6 max-w-3xl text-xs leading-relaxed text-stone-400">
        The model runs on a{' '}
        <a href={SPACE_URL} className="underline hover:text-stone-600" target="_blank" rel="noopener">
          Hugging Face Space
        </a>
        . Your claims are sent there for processing and are not stored by this site; don't paste claims that are not
        yet published. Each visitor has a daily GPU allowance of a few translations.
      </p>
    </div>
  );
}
