import { ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";

function SealedMessageArt() {
  return (
    <svg
      className="sealed-art"
      viewBox="0 0 640 640"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="vault-halo">
          <stop stopColor="var(--primary)" stopOpacity=".2" />
          <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="vault-metal" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="var(--secondary)" />
          <stop offset=".5" stopColor="var(--card)" />
          <stop offset="1" stopColor="var(--background)" />
        </linearGradient>
        <linearGradient id="vault-core" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="var(--ring)" />
          <stop offset="1" stopColor="var(--primary)" />
        </linearGradient>
        <pattern
          id="vault-grid"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M40 0H0V40"
            fill="none"
            stroke="var(--primary)"
            strokeOpacity=".08"
          />
        </pattern>
      </defs>
      <circle cx="320" cy="320" r="310" fill="url(#vault-halo)" />
      <path
        d="M40 120 320 20 600 120V520L320 620 40 520Z"
        fill="url(#vault-grid)"
      />
      <g fill="none" stroke="var(--primary)">
        <circle cx="320" cy="320" r="265" strokeOpacity=".16" />
        <circle
          cx="320"
          cy="320"
          r="245"
          strokeDasharray="2 14"
          strokeOpacity=".4"
        />
        <g className="vault-orbit">
          <circle
            cx="320"
            cy="320"
            r="265"
            strokeWidth="2"
            strokeDasharray="95 322"
          />
          <path
            d="M320 43V67M573 320H597M320 573V597M43 320H67"
            strokeWidth="4"
          />
        </g>
        <path
          d="M0 320H100M540 320H640M320 0V95M320 545V640"
          strokeOpacity=".25"
        />
      </g>
      <g className="vault-float">
        <path
          d="m320 135 175 100v200L320 535 145 435V235Z"
          fill="var(--background)"
          stroke="var(--primary)"
          strokeOpacity=".18"
        />
        <path
          d="m320 110 180 104-42 25-138-80-138 80-42-25Z"
          fill="url(#vault-metal)"
          stroke="var(--primary)"
          strokeOpacity=".65"
        />
        <path
          d="m140 238 42 25v148l-42 25-26-15V253Z"
          fill="url(#vault-metal)"
          stroke="var(--primary)"
          strokeOpacity=".5"
        />
        <path
          d="m500 238-42 25v148l42 25 26-15V253Z"
          fill="url(#vault-metal)"
          stroke="var(--ring)"
          strokeOpacity=".7"
        />
        <path
          d="m140 462 42-25 138 80 138-80 42 25-180 104Z"
          fill="url(#vault-metal)"
          stroke="var(--primary)"
          strokeOpacity=".65"
        />
        <path
          d="m198 275 122-70 122 70v140l-122 70-122-70Z"
          fill="var(--background)"
          stroke="var(--primary)"
          strokeOpacity=".2"
        />
        <path
          d="m225 298 95-55 95 55v106l-95 55-95-55Z"
          fill="var(--primary)"
          opacity=".07"
        />
        <g transform="translate(218 264) rotate(-12 102 72)">
          <path
            d="M10 14H188L204 30V132L188 148H10L-6 132V30Z"
            fill="var(--background)"
            stroke="var(--primary)"
            strokeWidth="2"
          />
          <path
            d="M0 0H178L194 16V118L178 134H0L-16 118V16Z"
            fill="url(#vault-core)"
          />
          <path
            d="m-3 17 92 69 92-69M-3 115l61-47m123 47-61-47"
            fill="none"
            stroke="var(--primary-foreground)"
            strokeWidth="2"
          />
          <path
            d="m75 72 14-8 14 8v16l-14 8-14-8Z"
            fill="var(--primary-foreground)"
          />
          <path
            d="M5 8H45M156 126h20"
            stroke="var(--foreground)"
            strokeOpacity=".65"
          />
        </g>
        <path
          className="vault-pulse"
          d="m158 227 27 16m270 0 27-16M320 127v30m0 367v26"
          fill="none"
          stroke="var(--ring)"
          strokeWidth="4"
        />
      </g>
      <g
        fill="var(--primary)"
        fontFamily="JetBrains Mono, monospace"
        fontSize="10"
        letterSpacing="2"
      >
        <text x="30" y="165" opacity=".65">
          7F / A2 / 09
        </text>
        <text x="466" y="485" opacity=".65">
          C4 / 8E / F1
        </text>
        <text x="260" y="606">
          SEALED / 001
        </text>
      </g>
      <path
        d="M96 174h40l24 24M504 459h35l22 22"
        fill="none"
        stroke="var(--primary)"
        strokeOpacity=".5"
      />
    </svg>
  );
}

export function HomePage() {
  return (
    <div className="landing">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-copy">
          <p className="landing-kicker">
            <span /> WORDS WORTH KEEPING PRIVATE.
          </p>
          <h1 id="landing-title">
            <span>SAY IT.</span>
            <span className="landing-outline">SEAL IT.</span>
            <span className="landing-accent">SHARE IT.</span>
          </h1>
          <p className="landing-description">
            Private messages.
            <br />
            Encrypted in your browser.
          </p>
          <div className="landing-actions">
            <Link className="landing-cta" to="/send">
              Encrypt a message <ArrowUpRight size={20} />
            </Link>
            <Link className="landing-cta landing-cta-secondary" to="/open">
              Decrypt a link <ArrowDownLeft size={20} />
            </Link>
          </div>
        </div>
        <div className="landing-art">
          <div className="art-index">
            FIG. 001 <span>THE SEALED MESSAGE</span>
          </div>
          <SealedMessageArt />
          <div className="art-caption">
            <Plus size={12} /> YOUR MESSAGE. UNDER WRAPS. <Plus size={12} />
          </div>
        </div>
      </section>
      <div className="landing-process" aria-label="Write, encrypt, share">
        <span>01 / WRITE</span>
        <ArrowUpRight />
        <span>02 / ENCRYPT</span>
        <ArrowUpRight />
        <span>03 / SHARE</span>
      </div>
      <section className="landing-receive">
        <div>
          <p className="landing-kicker">ON THE OTHER SIDE?</p>
          <h2>EXPECTING A MESSAGE?</h2>
          <p>Create your Receive link.</p>
        </div>
        <Link className="landing-receive-link" to="/identities">
          Get receiving keys <ArrowUpRight size={28} />
        </Link>
      </section>
      <footer className="landing-footer">
        <span>EXPERIMENTAL / MESSAGE LAB</span>
        <nav aria-label="Tools">
          <Link to="/compatibility">Compatibility</Link>
          <Link to="/recover">Recover</Link>
          <Link to="/delete">Delete</Link>
          <Link to="/diagnostics">Diagnostics</Link>
        </nav>
      </footer>
    </div>
  );
}
