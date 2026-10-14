import type { MouseEvent, ReactNode } from 'react';

export type PublicRoute = 'home' | 'how-it-works' | 'evidence' | 'docs' | 'app';

const CONTRACT_ADDRESS = 'b62b97709f7629cede3bcbcd52ecda4fe2ad204ceac2946fda484789d104d23b';
const EVIDENCE = [
  ['Deployment', '0044682865b940b3054c6fb1f065f4d19acc2627daa543dff4aaedbc88e8bcaf9c'],
  ['Member admission', '00ed9c0173c6dfa599c494f5cef901ea999e034c1e0d615cf658289ff7cc8af0ec'],
  ['Inventory certification', '00162a6cea69226e4731b519f76ca71e14e011eca434cfe2a08b88dda51f02f66b'],
  ['XZ 5.6.0 policy', '00ddf48a2547cce14bb422981a1ebb69e7a7e94f275e2ba9b24ac6de8d555d58ea'],
  ['XZ 5.6.1 policy', '00e7b17f940d9a156286ecfda8e222aa8604886774ca0c92a4f159457752591887'],
  ['Private exposure proof', '009c158f65b339b14130f7fc41fddc1735fad1acded068fcc429e23e6ec716ad47'],
] as const;

interface PublicSiteProps { readonly route: PublicRoute; readonly onNavigate: (href: string) => void }

function Link({ href, onNavigate, className, children }: { href: string; onNavigate: (href: string) => void; className?: string; children: ReactNode }) {
  const follow = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); onNavigate(href);
  };
  return <a href={href} className={className} onClick={follow}>{children}</a>;
}

function Shell({ route, onNavigate, children }: PublicSiteProps & { children: ReactNode }) {
  return <main className="site-shell">
    <nav className="site-nav" aria-label="Primary navigation">
      <Link href="/" onNavigate={onNavigate} className="site-brand"><span>CV</span><strong>CommonVeil</strong></Link>
      <div className="site-nav-links">
        <Link href="/how-it-works" onNavigate={onNavigate} className={route === 'how-it-works' ? 'active' : undefined}>How it works</Link>
        <Link href="/evidence" onNavigate={onNavigate} className={route === 'evidence' ? 'active' : undefined}>Evidence</Link>
        <Link href="/docs" onNavigate={onNavigate} className={route === 'docs' ? 'active' : undefined}>Documentation</Link>
        <Link href="/app" onNavigate={onNavigate} className="site-launch-link">Launch app</Link>
      </div>
    </nav>
    {children}
    <footer className="site-footer"><span>CommonVeil · Built with Compact on Midnight Preprod</span><div><Link href="/docs" onNavigate={onNavigate}>Documentation</Link><a href="https://github.com/0xaje/CommonVeil" target="_blank" rel="noreferrer">GitHub ↗</a></div></footer>
  </main>;
}

function Home({ onNavigate }: Pick<PublicSiteProps, 'onNavigate'>) {
  return <>
    <header className="site-hero">
      <div className="site-hero-copy"><div className="site-eyebrow">BUILT ON MIDNIGHT · PREPROD</div><h1>Coordinate exposure.<br /><span>Keep inventory private.</span></h1><p>CommonVeil lets an admitted organization prove that a previously certified software snapshot matches an affected-release policy—without publishing the organization or its inventory.</p><div className="site-actions"><Link href="/app" onNavigate={onNavigate} className="site-primary">Launch app</Link><Link href="/how-it-works" onNavigate={onNavigate} className="site-secondary">See how it works</Link></div></div>
      <aside className="site-result-card"><div className="site-card-kicker"><span className="site-pulse" /> Genuine host evaluation</div><strong className="site-version">5.2.5</strong><span className="site-muted">certified XZ Utils version</span><div className="site-outcome">Outside registered 5.6.0 policy</div><dl><div><dt>Member</dt><dd>Verified</dd></div><div><dt>Snapshot</dt><dd>Certified</dd></div><div><dt>Attestation</dt><dd>Correctly blocked</dd></div></dl></aside>
    </header>
    <section className="site-home-strip" aria-label="Product summary"><div><small>01 · PRIVATE INPUT</small><strong>Inventory stays with the organization.</strong></div><div><small>02 · COMPACT PROOF</small><strong>Authorization and exact matching are enforced.</strong></div><div><small>03 · PUBLIC SIGNAL</small><strong>Only a nullifier and aggregate count are recorded.</strong></div></section>
    <section className="site-cta-panel"><div><div className="site-eyebrow">A WORKING MIDNIGHT PROTOCOL</div><h2>Inspect the design, verify the evidence, then operate the role you hold.</h2></div><div className="site-link-stack"><Link href="/how-it-works" onNavigate={onNavigate}>Understand the protocol <span>→</span></Link><Link href="/evidence" onNavigate={onNavigate}>Review Preprod evidence <span>→</span></Link><Link href="/docs" onNavigate={onNavigate}>Read the documentation <span>→</span></Link></div></section>
  </>;
}

function PageIntro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) { return <header className="site-page-intro"><div className="site-eyebrow">{eyebrow}</div><h1>{title}</h1><p>{copy}</p></header> }

function HowItWorks() {
  const steps = [['01','Registrar','Deploys the contract, admits opaque Member credentials, and registers exact affected releases.'],['02','Member','Runs a genuine host scan and sends a strictly bounded certification request to an independent Certifier.'],['03','Certifier','Reviews the evidence and commits the authorized snapshot before policy activation.'],['04','Policy','The Registrar activates an exact advisory, product, and version tuple on-chain.'],['05','Private proof','The Member proves a certified snapshot is affected without publishing the private tuple.'],['06','Public result','Compact records one nullifier and increments the aggregate count while rejecting duplicates.']];
  return <><PageIntro eyebrow="THE PROTOCOL" title="Three authorities. One narrow public claim." copy="CommonVeil separates governance, certification, and proof so no single role can manufacture an exposure report." />
    <section className="site-guarantee-grid"><article><small>PROVES</small><h3>Authorization and timing</h3><p>Compact verifies admitted membership, authorized pre-policy certification, exact affected-set membership, and non-replay.</p></article><article><small>PUBLISHES</small><h3>Only accountable signals</h3><p>The ledger stores opaque commitments, an advisory-scoped nullifier, and an aggregate accepted count.</p></article><article><small>KEEPS PRIVATE</small><h3>Operational details</h3><p>Organization identity, software inventory, role secrets, member salts, and snapshot salts stay outside public receipts.</p></article></section>
    <section className="site-process">{steps.map(([step,title,copy]) => <article key={step}><span>{step}</span><div><h3>{title}</h3><p>{copy}</p></div></article>)}</section>
    <section className="site-midnight-panel"><div><div className="site-eyebrow">WHY MIDNIGHT</div><h2>Privacy is enforced in the transaction, not promised by the interface.</h2></div><p>Four Compact circuits—<code>registerMember</code>, <code>certifyInventory</code>, <code>registerAffectedRelease</code>, and <code>attest</code>—make the role boundaries and privacy claim verifiable.</p></section>
  </>;
}

function Evidence() { return <><PageIntro eyebrow="VERIFIABLE EVIDENCE" title="Real outcomes, separated by provenance." copy="The genuine-host evaluation and the earlier controlled affected-input run are shown separately so the evidence never implies a result that did not occur." />
  <section className="site-evidence-hero"><div className="site-evidence-heading"><div><span className="site-proof-label">GENUINE HOST · 14 OCT 2026</span><h2>The truthful result was negative.</h2></div><span className="site-status-pill">No attestation submitted</span></div><div className="site-metrics"><div><small>Contract</small><code>{CONTRACT_ADDRESS}</code></div><div><small>Package</small><strong>pkg:generic/xz-utils</strong></div><div><small>Measured</small><strong>5.2.5</strong></div><div><small>Policy</small><strong>5.6.0</strong></div><div><small>Outcome</small><strong className="site-green">Unaffected</strong></div><div><small>Provenance</small><strong>live-host-scan</strong></div></div><p className="site-evidence-note">The Member was admitted and the snapshot was certified, but the exact version did not match the registered affected release. CommonVeil correctly stopped before wallet approval.</p></section>
  <section className="site-reference"><div className="site-section-heading"><div className="site-eyebrow">CONTROLLED AFFECTED INPUT · GENUINE PREPROD EXECUTION</div><h2>Positive-path protocol evidence</h2><p>The reference run used a controlled affected 5.6.1 input and finalized genuine Midnight Preprod transactions. It is not presented as the live host result.</p></div><div className="site-tx-list">{EVIDENCE.map(([label,tx]) => <div key={tx}><span>{label}</span><code>{tx}</code><b>Finalized</b></div>)}</div></section>
  <section className="site-boundary"><strong>Evidence boundary</strong><p>CommonVeil verifies authorization, timing, exact tuple membership, and replay protection. The package-manager scan is genuine evidence, but it is not hardware-attested and does not claim complete asset discovery.</p></section></> }

const DOC_SECTIONS = [['getting-started','Getting started'],['architecture','Architecture'],['registrar','Registrar workflow'],['certifier','Certifier workflow'],['member','Member workflow'],['packages','Packages and receipts'],['privacy','Privacy boundaries'],['troubleshooting','Troubleshooting']] as const;

function Documentation() { return <><PageIntro eyebrow="PRODUCT DOCUMENTATION" title="Operate CommonVeil without guessing." copy="Follow the role-specific procedures, understand every handoff, and verify what the protocol does—and does not—claim." /><div className="site-doc-layout"><aside className="site-doc-nav" aria-label="Documentation sections">{DOC_SECTIONS.map(([id,label]) => <a key={id} href={`#${id}`}>{label}</a>)}</aside><div className="site-doc-content">
  <section id="getting-started"><span>01</span><h2>Getting started</h2><ol><li>Use a current Chromium browser with the 1AM wallet configured for Midnight Preprod.</li><li>Start the local proof server and confirm <code>http://localhost:6300/health</code> returns a healthy response.</li><li>Configure the active Preprod indexer through the validated Blockfrost override when the wallet endpoint is unavailable.</li><li>Connect 1AM, select the authority you hold, and attach the deployed CommonVeil contract.</li></ol></section>
  <section id="architecture"><span>02</span><h2>Architecture</h2><p>The frontend coordinates a 1AM wallet, Midnight indexer, proof provider, generated Compact bindings, and local encrypted role packages. The contract stores only public keys, commitments, affected release identifiers, nullifiers, counters, and policy state.</p><div className="site-code-grid"><code>1AM → balance and submit</code><code>Indexer → read public state</code><code>Proof server → prove circuits</code><code>Compact → enforce protocol</code></div></section>
  <section id="registrar"><span>03</span><h2>Registrar workflow</h2><ol><li>Create or restore the Registrar secret and test the downloaded encrypted backup.</li><li>Import the independent Certifier public-key package before deployment.</li><li>Deploy or attach the contract and verify the Registrar identity locally.</li><li>Import a Member admission package and approve the on-chain admission.</li><li>Register an exact affected release only after inventory certification is complete.</li></ol></section>
  <section id="certifier"><span>04</span><h2>Certifier workflow</h2><ol><li>Create an independent identity and verify its encrypted backup.</li><li>Export only the public Certifier key for the Registrar.</li><li>Attach the contract and verify the secret against its public state.</li><li>Import a genuine <code>commonveil.certification-request/v1</code> package.</li><li>Certify before policy activation and return the encrypted snapshot to the Member.</li></ol></section>
  <section id="member"><span>05</span><h2>Member workflow</h2><ol><li>Create the Member secret and salt, download the encrypted backup, and test recovery.</li><li>Export the admission package and send it to the Registrar.</li><li>Verify admission on-chain, then import JSON produced by <code>npm run --silent scan:json</code>.</li><li>Export the bounded certification request to the Certifier.</li><li>Import the encrypted snapshot and affected-release receipt; submit only when every prerequisite matches.</li></ol></section>
  <section id="packages"><span>06</span><h2>Packages and receipts</h2><p>Role handoffs use versioned JSON schemas with strict field allowlists. Private payloads use AES-256-GCM with PBKDF2-SHA-256 at 600,000 iterations. Passwords, wallet seeds, role secrets, and private salts never belong in public receipts.</p></section>
  <section id="privacy"><span>07</span><h2>Privacy boundaries</h2><p>The final attestation reveals an advisory-scoped nullifier and aggregate count. Product, version, Member credential, Member secret, Member salt, snapshot salt, and inventory commitment are not directly disclosed by <code>attest</code>.</p><div className="site-doc-warning">CommonVeil does not prevent a software compromise. It provides private, verifiable coordination after disclosure.</div></section>
  <section id="troubleshooting"><span>08</span><h2>Troubleshooting</h2><dl><div><dt>Indexer lookup fails</dt><dd>Confirm both Blockfrost URLs, restart Vite, reconnect 1AM, and inspect the same contract again.</dd></div><div><dt>Backup decryption fails</dt><dd>Select the exact role backup and enter the exact untrimmed password used during export.</dd></div><div><dt>No wallet prompt</dt><dd>Confirm the proof server is healthy and every workspace prerequisite is satisfied.</dd></div><div><dt>Attestation blocked</dt><dd>A non-affected version is an honest outcome and must not submit a transaction.</dd></div></dl></section>
  </div></div></> }

function AppHub({ onNavigate }: Pick<PublicSiteProps, 'onNavigate'>) { const roles = [['01 · GOVERNANCE','Registrar','Deploy contracts, admit opaque Member credentials, and activate exact affected-release policy.','registrar'],['02 · INVENTORY','Certifier','Review genuine inventory evidence and commit an authorized snapshot before policy activation.','certifier'],['03 · PRIVATE PROOF','Member','Manage a recoverable identity, submit private inventory evidence, and evaluate active policy.','member']] as const; return <><PageIntro eyebrow="OPERATIONAL APP" title="Enter with the authority you actually hold." copy="Selecting a workspace grants no privilege. Compact verifies the corresponding role secret before an authorized transaction can succeed." /><section className="site-role-grid">{roles.map(([eyebrow,title,copy,role]) => <Link key={role} href={`/?role=${role}`} onNavigate={onNavigate} className="site-role-card"><small>{eyebrow}</small><h2>{title}</h2><p>{copy}</p><strong>Open workspace <span>→</span></strong></Link>)}</section><section className="site-app-help"><div><strong>New operator?</strong><p>Read the role procedures and backup rules before creating an identity or approving a transaction.</p></div><Link href="/docs" onNavigate={onNavigate} className="site-secondary">Open documentation</Link></section></> }

export function PublicSite({ route, onNavigate }: PublicSiteProps) { return <Shell route={route} onNavigate={onNavigate}>{route === 'home' ? <Home onNavigate={onNavigate} /> : route === 'how-it-works' ? <HowItWorks /> : route === 'evidence' ? <Evidence /> : route === 'docs' ? <Documentation /> : <AppHub onNavigate={onNavigate} />}</Shell> }
