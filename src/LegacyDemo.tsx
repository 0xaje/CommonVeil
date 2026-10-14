const CONTRACT_ADDRESS = 'b62b97709f7629cede3bcbcd52ecda4fe2ad204ceac2946fda484789d104d23b';

const VERIFIED_REFERENCE_EVIDENCE = [
  ['Deployment', '0044682865b940b3054c6fb1f065f4d19acc2627daa543dff4aaedbc88e8bcaf9c'],
  ['Member admission', '00ed9c0173c6dfa599c494f5cef901ea999e034c1e0d615cf658289ff7cc8af0ec'],
  ['Inventory certification', '00162a6cea69226e4731b519f76ca71e14e011eca434cfe2a08b88dda51f02f66b'],
  ['XZ 5.6.0 policy', '00ddf48a2547cce14bb422981a1ebb69e7a7e94f275e2ba9b24ac6de8d555d58ea'],
  ['XZ 5.6.1 policy', '00e7b17f940d9a156286ecfda8e222aa8604886774ca0c92a4f159457752591887'],
  ['Private exposure proof', '009c158f65b339b14130f7fc41fddc1735fad1acded068fcc429e23e6ec716ad47'],
] as const;

const short = (value: string) => `${value.slice(0, 12)}…${value.slice(-8)}`;

export function LegacyDemo() {
  return (
    <main>
      <nav>
        <a className="brand" href="#top" aria-label="CommonVeil home"><span>CV</span> CommonVeil</a>
        <div className="nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#live-evidence">Evidence</a>
          <a href="#workspaces">Workspaces</a>
          <a className="repo-link" href="https://github.com/0xaje/CommonVeil" target="_blank" rel="noreferrer">GitHub ↗</a>
        </div>
      </nav>

      <header id="top" className="hero">
        <div className="hero-copy">
          <div className="eyebrow">BUILT ON MIDNIGHT · PREPROD</div>
          <h1>Coordinate exposure.<br /><span>Keep inventory private.</span></h1>
          <p>CommonVeil lets an admitted organization prove whether a certified software snapshot falls inside an affected-release policy—without publishing the organization or its inventory.</p>
          <div className="hero-actions">
            <a className="primary-link" href="#workspaces">Open a workspace</a>
            <a className="secondary-link" href="#live-evidence">Review live evidence</a>
          </div>
        </div>

        <aside className="proof-card honest-result-card">
          <div className="proof-top"><span className="pulse" /> Genuine host evaluation</div>
          <div className="result-version">5.2.5</div>
          <div className="proof-caption">certified XZ Utils version</div>
          <div className="result-badge">Outside registered 5.6.0 policy</div>
          <div className="proof-rows">
            <span>Member admission <b>Verified</b></span>
            <span>Snapshot <b>Certified</b></span>
            <span>Attestation <b>Correctly blocked</b></span>
          </div>
        </aside>
      </header>

      <section id="how-it-works" className="section-heading">
        <div className="eyebrow">THE PROTOCOL</div>
        <h2>Three authorities. One narrow public claim.</h2>
        <p>The Registrar controls admission and policy. The Certifier commits inventory before the policy is active. The Member later proves a match without publishing the private tuple.</p>
      </section>

      <section className="explainer" aria-label="Protocol guarantees">
        <div><small>Proves</small><strong>Admission, pre-policy certification, exact affected-set membership, and non-replay</strong></div>
        <div><small>Publishes</small><strong>Opaque commitments, an advisory-scoped nullifier, and an aggregate count</strong></div>
        <div><small>Keeps private</small><strong>Organization identity, software inventory, role secrets, and snapshot salt</strong></div>
      </section>

      <section className="role-flow">
        <div><span>01</span><h3>Registrar</h3><p>Deploys the contract, admits opaque credentials, and registers exact affected releases.</p></div>
        <div><span>02</span><h3>Certifier</h3><p>Reviews genuine inventory evidence and commits an authorized snapshot before activation.</p></div>
        <div><span>03</span><h3>Member</h3><p>Holds its identity and inventory handoff privately, then evaluates the active policy.</p></div>
        <div><span>04</span><h3>Compact</h3><p>Rejects unauthorized roles, late certification, tuple mismatches, and duplicate reports.</p></div>
      </section>

      <section className="boundary">
        <strong>What the evidence means</strong>
        <p>The current operational run reached an honest negative result: the genuine host had XZ Utils 5.2.5 while the registered policy covered 5.6.0. No positive claim was manufactured, and no attestation transaction was requested.</p>
      </section>

      <section id="workspaces" className="section-heading demo-heading">
        <div className="eyebrow">OPERATIONAL WORKSPACES</div>
        <h2>Enter with the authority you actually hold.</h2>
        <p>Selecting a workspace grants no privilege. Compact circuits verify the relevant role secret before any authorized transaction can succeed.</p>
      </section>

      <section className="workspace-grid">
        <a className="workspace-card" href="/?role=registrar">
          <span>01 · GOVERNANCE</span>
          <h3>Registrar</h3>
          <p>Manage the Registrar identity, deploy a contract, admit Members, and activate affected-release policy.</p>
          <strong>Open Registrar workspace →</strong>
        </a>
        <a className="workspace-card" href="/?role=certifier">
          <span>02 · INVENTORY</span>
          <h3>Certifier</h3>
          <p>Prepare an independent identity, review genuine inventory evidence, and certify a pre-policy snapshot.</p>
          <strong>Open Certifier workspace →</strong>
        </a>
        <a className="workspace-card" href="/?role=member">
          <span>03 · PRIVATE PROOF</span>
          <h3>Member</h3>
          <p>Manage a recoverable identity, import a certified snapshot, and evaluate active policy privately.</p>
          <strong>Open Member workspace →</strong>
        </a>
      </section>

      <section id="live-evidence" className="section-heading evidence-heading">
        <div className="eyebrow">LIVE PREPROD EVIDENCE · 14 OCT 2026</div>
        <h2>The system returned the truthful answer.</h2>
        <p>A genuine host scan moved through Member admission, Certifier authorization, encrypted handoff, and Registrar policy activation. The final comparison was negative, so CommonVeil stopped before attestation.</p>
      </section>

      <section className="live-evidence-panel">
        <div className="run-summary">
          <div><small>Contract</small><code title={CONTRACT_ADDRESS}>{short(CONTRACT_ADDRESS)}</code></div>
          <div><small>Measured package</small><strong>pkg:generic/xz-utils</strong></div>
          <div><small>Certified version</small><strong>5.2.5</strong></div>
          <div><small>Registered release</small><strong>5.6.0</strong></div>
          <div><small>Outcome</small><strong className="outcome-safe">Unaffected</strong></div>
          <div><small>Attestation transaction</small><strong>None</strong></div>
        </div>
        <div className="evidence-actions">
          <a className="primary-link" href="https://github.com/0xaje/CommonVeil/tree/cv007-role-workflows/docs/evidence/live-preprod-2026-10-14" target="_blank" rel="noreferrer">Open screenshot evidence ↗</a>
          <a className="secondary-link" href="https://github.com/0xaje/CommonVeil/blob/cv007-role-workflows/docs/demo-runbook.md" target="_blank" rel="noreferrer">Read demo runbook ↗</a>
        </div>
      </section>

      <section className="section-heading reference-heading">
        <div className="eyebrow">EARLIER POSITIVE REFERENCE RUN · CV-005</div>
        <h2>Positive-path network evidence, kept separate.</h2>
        <p>These six finalized transaction IDs belong to an earlier controlled protocol run. They are not presented as transactions from the genuine-host evaluation above.</p>
      </section>

      <section className="evidence reference-evidence">
        <div className="reference-summary">
          <div><strong>1</strong><span>Accepted report</span></div>
          <div><strong>1</strong><span>Used nullifier</span></div>
          <div><strong>6</strong><span>Finalized transactions</span></div>
        </div>
        {VERIFIED_REFERENCE_EVIDENCE.map(([label, txId]) => <div key={txId}><span>{label}</span><code>{txId}</code></div>)}
      </section>

      <section className="closing">
        <div><div className="eyebrow">HONEST SCOPE</div><h2>Privacy coordination—not a claim of perfect measurement.</h2></div>
        <p>CommonVeil verifies authorization, timing, exact release membership, and replay protection. Package-manager scanning is genuine host evidence, but hardware-backed scanner provenance, inventory completeness, and production key custody remain explicit future work.</p>
      </section>

      <footer><span>CommonVeil · Built on Midnight Preprod</span><span>Exact policy matching · Private inventory · No fabricated exposure</span></footer>
    </main>
  );
}
