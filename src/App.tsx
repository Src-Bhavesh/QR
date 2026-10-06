import { useEffect, useRef, useState, type FormEvent } from "react";
import QRCode from "qrcode";

const SAMPLE_URL = "https://example.com";
const DEFAULT_COLOR = "#2c4438";
const QR_SIZE = 640;

const QR_COLORS = [
  { name: "Pine", value: "#2c4438" },
  { name: "Ink", value: "#222622" },
  { name: "Brick", value: "#a74e39" },
];

type GeneratedCode = {
  dataUrl: string;
  destination: string;
  color: string;
};

function normalizeWebAddress(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Add a web address to make your QR code.");
  }

  const hasWebProtocol = /^https?:\/\//i.test(trimmed);
  const hasOtherProtocol = /^[a-z][a-z\d+.-]*:/i.test(trimmed);
  const hostWithPort = /^[^/?#]+:\d+(?:[/?#]|$)/i.test(trimmed);

  if (hasOtherProtocol && !hasWebProtocol && !hostWithPort) {
    throw new Error("Use a website address beginning with http:// or https://.");
  }

  const candidate = hasWebProtocol ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (!parsed.hostname || !["http:", "https:"].includes(parsed.protocol)) {
      throw new Error();
    }
    return parsed.href;
  } catch {
    throw new Error("That address looks incomplete. Try example.com or a full https:// link.");
  }
}

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M11 5H6a1 1 0 0 0-1 1v5m16-6h5a1 1 0 0 1 1 1v5m0 10v5a1 1 0 0 1-1 1h-5M5 21v5a1 1 0 0 0 1 1h5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="square"
      />
      <rect x="12" y="12" width="8" height="8" rx="1" fill="#d2e59a" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 13.5a4.3 4.3 0 0 0 6.1 0l2.2-2.2a4.3 4.3 0 0 0-6.1-6.1l-1.3 1.3m3.1 4a4.3 4.3 0 0 0-6.1 0l-2.2 2.2a4.3 4.3 0 0 0 6.1 6.1l1.3-1.3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 10h11m-4.5-4.5L15 10l-4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3.5v8m0 0 3-3m-3 3-3-3M4 14v2h12v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="3.5" y="8" width="11" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 8V5.5a3 3 0 0 1 6 0V8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="9" cy="11.6" r=".8" fill="currentColor" />
    </svg>
  );
}

export default function App() {
  const [link, setLink] = useState(SAMPLE_URL);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [result, setResult] = useState<GeneratedCode | null>(null);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(true);
  const requestId = useRef(0);

  async function makeCode(destination: string, foreground: string, currentRequest: number) {
    try {
      const dataUrl = await QRCode.toDataURL(destination, {
        errorCorrectionLevel: "H",
        margin: 2,
        width: QR_SIZE,
        color: { dark: foreground, light: "#ffffff" },
      });

      if (requestId.current === currentRequest) {
        setResult({ dataUrl, destination, color: foreground });
        setError("");
      }
    } catch {
      if (requestId.current === currentRequest) {
        setResult(null);
        setError("We couldn't make that code. Check the address and try again.");
      }
    } finally {
      if (requestId.current === currentRequest) {
        setIsGenerating(false);
      }
    }
  }

  useEffect(() => {
    const initialRequest = ++requestId.current;
    void makeCode(SAMPLE_URL, DEFAULT_COLOR, initialRequest);

    return () => {
      requestId.current += 1;
    };
  }, []);

  function clearPreview() {
    requestId.current += 1;
    setResult(null);
    setError("");
    setIsGenerating(false);
  }

  function handleLinkChange(value: string) {
    clearPreview();
    setLink(value);
  }

  function handleColorChange(value: string) {
    clearPreview();
    setColor(value);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let destination: string;
    try {
      destination = normalizeWebAddress(link);
    } catch (caught) {
      requestId.current += 1;
      setResult(null);
      setIsGenerating(false);
      setError(caught instanceof Error ? caught.message : "Enter a valid website address.");
      return;
    }

    const currentRequest = ++requestId.current;
    setError("");
    setIsGenerating(true);
    await makeCode(destination, color, currentRequest);
  }

  function handleDownload() {
    if (!result) return;

    const host = new URL(result.destination).hostname
      .replace(/^www\./i, "")
      .replace(/[^a-z0-9-]+/gi, "-")
      .replace(/^-|-$/g, "");
    const anchor = document.createElement("a");
    anchor.href = result.dataUrl;
    anchor.download = `linkfield-${host || "qr-code"}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  const statusText = isGenerating ? "Making your code" : result ? "Ready to scan" : "Waiting for a link";

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Linkfield home">
          <span className="brand-mark"><BrandMark /></span>
          <span className="brand-name">linkfield</span>
        </a>
        <div className="privacy-note">
          <span className="privacy-dot" />
          <span>Made privately, in your browser</span>
        </div>
      </header>

      <main className="main-content" id="top">
        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow"><span className="eyebrow-rule" /> A small tool for links that travel</p>
          <h1 id="page-title">Take your link<br /><em>offline.</em></h1>
          <p className="intro-copy">Make a crisp, downloadable QR code for any web address. No account, no upload, just a quicker way to share.</p>
        </section>

        <section className="workbench" aria-label="QR code maker">
          <div className="setup-panel">
            <div className="panel-heading">
              <p className="panel-kicker"><span>01</span> Details</p>
              <h2>Set up your code</h2>
            </div>

            <form className="setup-form" onSubmit={handleSubmit}>
              <div className="field-group">
                <label className="field-label" htmlFor="website-link">Website address</label>
                <div className={`url-field${error ? " has-error" : ""}`}>
                  <span className="url-field-icon"><LinkIcon /></span>
                  <input
                    id="website-link"
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    spellCheck={false}
                    value={link}
                    onChange={(event) => handleLinkChange(event.target.value)}
                    aria-describedby="link-help"
                    aria-invalid={Boolean(error)}
                    placeholder="yoursite.com"
                  />
                </div>
                <p className={`field-help${error ? " field-error" : ""}`} id="link-help" aria-live="polite">
                  {error || (link === SAMPLE_URL ? "Sample link included. Replace it with your own." : "A domain or a full https:// address both work.")}
                </p>
              </div>

              <fieldset className="color-field">
                <legend className="field-label">QR colour</legend>
                <div className="color-choices" role="group" aria-label="QR code colour">
                  {QR_COLORS.map((option) => (
                    <button
                      className="color-choice"
                      type="button"
                      key={option.value}
                      aria-pressed={color.toLowerCase() === option.value}
                      onClick={() => handleColorChange(option.value)}
                    >
                      <span className="color-dot" style={{ backgroundColor: option.value }} />
                      <span>{option.name}</span>
                    </button>
                  ))}
                  <label className="color-choice custom-choice">
                    <input
                      type="color"
                      aria-label="Choose a custom QR colour"
                      value={color}
                      onChange={(event) => handleColorChange(event.target.value)}
                    />
                    <span>Custom</span>
                  </label>
                </div>
              </fieldset>

              <button className="create-button" type="submit" disabled={isGenerating || !link.trim()}>
                <span>{isGenerating ? "Making your code" : "Create QR code"}</span>
                {isGenerating ? <span className="spinner" aria-hidden="true" /> : <ArrowIcon />}
              </button>
              <p className="local-note"><LockIcon /> Your link stays on this device.</p>
            </form>
          </div>

          <div className="preview-panel">
            <div className="preview-heading">
              <div className="panel-heading">
                <p className="panel-kicker"><span>02</span> Preview</p>
                <h2>Your code, ready to go</h2>
              </div>
              <div className={`preview-status${result && !isGenerating ? " is-ready" : ""}`} aria-live="polite">
                <span className="status-dot" />
                <span>{statusText}</span>
              </div>
            </div>

            <div className="preview-stage" aria-live="polite">
              {result ? (
                <div className="qr-artboard" key={`${result.destination}-${result.color}`}>
                  <img className="qr-image" src={result.dataUrl} alt={`QR code for ${result.destination}`} />
                </div>
              ) : (
                <div className="empty-preview">
                  <div className="empty-mark" aria-hidden="true">
                    <svg viewBox="0 0 64 64" fill="none">
                      <path d="M8 23V8h15M41 8h15v15m0 18v15H41M23 56H8V41" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
                      <path d="M26 26h12v12H26z" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                  <p className="empty-title">Your code goes here.</p>
                  <p className="empty-copy">Add a link, then create your QR code.</p>
                </div>
              )}
            </div>

            <div className="output-details">
              <div className="destination-block">
                <p className="destination-label">POINTS TO</p>
                <p className="destination-value" title={result?.destination || undefined}>
                  {result?.destination || "Your website address"}
                </p>
              </div>
              <div className="output-actions">
                <span className="file-spec">PNG <span /> {QR_SIZE} px</span>
                <button className="download-button" type="button" onClick={handleDownload} disabled={!result || isGenerating}>
                  <DownloadIcon />
                  <span>Download PNG</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <footer className="page-footer">
          <span className="footer-mark" />
          <p>Printing it? Leave a little breathing room around the code for easy scanning.</p>
        </footer>
      </main>
    </div>
  );
}