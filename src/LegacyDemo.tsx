import { useEffect, useMemo, useRef, useState } from 'react';
import { deployContract, submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { CompiledCommonVeilContract, CommonVeil } from './contract';
import { connectProviders, PRIVATE_STATE_ID, type CommonVeilProviders, type ConnectedWallet } from './providers';

type Stage =
  | 'idle' | 'connecting' | 'connected' | 'deploying' | 'deployed'
  | 'enrolling' | 'enrolled' | 'certifying' | 'certified' | 'registering' | 'ready'
  | 'proving' | 'verified' | 'failed';

type Evidence = { readonly label: string; readonly txId: string };
type PublicState = {
  readonly accepted: bigint;
  readonly members: bigint;
  readonly affectedReleases: bigint;
  readonly inventoryCommitments: bigint;
  readonly nullifiers: bigint;
};

const short = (value: string) => value.length > 22 ? `${value.slice(0, 12)}…${value.slice(-8)}` : value;
const bytesToHex = (value: Uint8Array) => [...value].map((byte) => byte.toString(16).padStart(2, '0')).join('');
const erase = (value?: Uint8Array) => value?.fill(0);
const formatDust = (raw: bigint) => {
  const whole = raw / 1_000_000_000_000_000n;
  const fraction = (raw % 1_000_000_000_000_000n).toString().padStart(15, '0').slice(0, 4);
  return `${whole}.${fraction}`;
};

async function advisoryDigest(label: string): Promise<Uint8Array> {
  const normalized = label.trim();
  if (!normalized) throw new Error('Enter a real advisory identifier before registering it.');
  const input = new TextEncoder().encode(`commonveil:advisory:v1:${normalized}`);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', input));
}

async function productDigest(label: string): Promise<Uint8Array> {
  const input = new TextEncoder().encode(`commonveil:product:v1:${label}`);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', input));
}

const POLICY_ADVISORY = 'CVE-2024-3094';
const POLICY_PRODUCT = 'pkg:generic/xz-utils';
const AFFECTED_PATCHES = [0n, 1n] as const;
const VERIFIED_REFERENCE_EVIDENCE: Evidence[] = [
  { label: 'Deployment', txId: '0044682865b940b3054c6fb1f065f4d19acc2627daa543dff4aaedbc88e8bcaf9c' },
  { label: 'Member admission', txId: '00ed9c0173c6dfa599c494f5cef901ea999e034c1e0d615cf658289ff7cc8af0ec' },
  { label: 'Inventory certification', txId: '00162a6cea69226e4731b519f76ca71e14e011eca434cfe2a08b88dda51f02f66b' },
  { label: 'XZ 5.6.0 policy', txId: '00ddf48a2547cce14bb422981a1ebb69e7a7e94f275e2ba9b24ac6de8d555d58ea' },
  { label: 'XZ 5.6.1 policy', txId: '00e7b17f940d9a156286ecfda8e222aa8604886774ca0c92a4f159457752591887' },
  { label: 'Private exposure proof', txId: '009c158f65b339b14130f7fc41fddc1735fad1acded068fcc429e23e6ec716ad47' },
];

export function LegacyDemo() {
  const [stage, setStage] = useState<Stage>('idle');
  const [wallet, setWallet] = useState<ConnectedWallet>();
  const [contractAddress, setContractAddress] = useState<ContractAddress>();
  const [memberAdmitted, setMemberAdmitted] = useState(false);
  const [inventoryCommitted, setInventoryCommitted] = useState(false);
  const [advisoryLabel, setAdvisoryLabel] = useState('');
  const [advisoryId, setAdvisoryId] = useState<Uint8Array>();
  const [inventoryPatch, setInventoryPatch] = useState<'0' | '1'>('1');
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [publicState, setPublicState] = useState<PublicState>({ accepted: 0n, members: 0n, affectedReleases: 0n, inventoryCommitments: 0n, nullifiers: 0n });
  const [error, setError] = useState('');

  const adminSecret = useRef<Uint8Array | undefined>(undefined);
  const certifierSecret = useRef<Uint8Array | undefined>(undefined);
  const memberSecret = useRef<Uint8Array | undefined>(undefined);
  const memberSalt = useRef<Uint8Array | undefined>(undefined);
  const memberCredential = useRef<Uint8Array | undefined>(undefined);
  const snapshotSalt = useRef<Uint8Array | undefined>(undefined);
  const pendingEvidenceLabel = useRef('Transaction');
  const busy = ['connecting', 'deploying', 'enrolling', 'certifying', 'registering', 'proving'].includes(stage);

  useEffect(() => () => {
    erase(adminSecret.current);
    erase(certifierSecret.current);
    erase(memberSecret.current);
    erase(memberSalt.current);
    erase(memberCredential.current);
    erase(snapshotSalt.current);
  }, []);

  const statusLabel = useMemo(() => ({
    idle: 'Ready to connect',
    connecting: 'Waiting for wallet approval',
    connected: 'Wallet connected',
    deploying: 'Deploying registrar-bound contract',
    deployed: 'Contract deployed',
    enrolling: 'Admitting opaque member credential',
    enrolled: 'Member credential admitted',
    certifying: 'Authorized certifier is committing inventory',
    certified: 'Inventory certified before policy activation',
    registering: 'Registering exact affected releases',
    ready: 'Ready for private exposure proof',
    proving: 'Proving private product and version match',
    verified: 'Private affected-release proof verified',
    failed: 'Operation stopped safely',
  }[stage]), [stage]);

  const fail = (reason: unknown) => {
    console.error(reason);
    setError(reason instanceof Error ? reason.message : String(reason));
    setStage('failed');
  };

  const connect = async () => {
    setStage('connecting'); setError('');
    try {
      const connected = await connectProviders((txId) => {
        setEvidence((current) => [...current, { label: pendingEvidenceLabel.current, txId }]);
      });
      setWallet(connected); setStage('connected');
    } catch (reason) { fail(reason); }
  };

  const deploy = async () => {
    if (!wallet) return;
    setStage('deploying'); setError('');
    const nextAdminSecret = crypto.getRandomValues(new Uint8Array(32));
    const nextCertifierSecret = crypto.getRandomValues(new Uint8Array(32));
    try {
      const adminKey = CommonVeil.pureCircuits.deriveAdminKey(nextAdminSecret);
      const certifierKey = CommonVeil.pureCircuits.deriveCertifierKey(nextCertifierSecret);
      pendingEvidenceLabel.current = 'Deployment';
      const deployed = await deployContract(wallet.providers, {
        compiledContract: CompiledCommonVeilContract,
        privateStateId: PRIVATE_STATE_ID,
        initialPrivateState: {},
        args: [adminKey, certifierKey],
      });
      const address = deployed.deployTxData.public.contractAddress;
      wallet.providers.privateStateProvider.setContractAddress(address);
      adminSecret.current = nextAdminSecret;
      certifierSecret.current = nextCertifierSecret;
      setContractAddress(address); setStage('deployed');
    } catch (reason) {
      erase(nextAdminSecret);
      erase(nextCertifierSecret);
      fail(reason);
    }
  };

  const enroll = async () => {
    if (!wallet || !contractAddress || !adminSecret.current) return;
    setStage('enrolling'); setError('');
    const nextMemberSecret = crypto.getRandomValues(new Uint8Array(32));
    const nextMemberSalt = crypto.getRandomValues(new Uint8Array(32));
    try {
      const credential = CommonVeil.pureCircuits.deriveMemberCredential(nextMemberSecret, nextMemberSalt);
      pendingEvidenceLabel.current = 'Member admission';
      await submitCallTx(wallet.providers, {
        compiledContract: CompiledCommonVeilContract,
        contractAddress,
        privateStateId: PRIVATE_STATE_ID,
        circuitId: 'registerMember',
        args: [adminSecret.current, credential],
      });
      memberSecret.current = nextMemberSecret;
      memberSalt.current = nextMemberSalt;
      memberCredential.current = credential;
      setMemberAdmitted(true); setStage('enrolled');
    } catch (reason) {
      erase(nextMemberSecret); erase(nextMemberSalt);
      fail(reason);
    }
  };

  const registerAdvisory = async () => {
    if (!wallet || !contractAddress || !adminSecret.current || !inventoryCommitted) return;
    setStage('registering'); setError('');
    try {
      const digest = await advisoryDigest(advisoryLabel);
      const productId = await productDigest(POLICY_PRODUCT);
      for (const patch of AFFECTED_PATCHES) {
        pendingEvidenceLabel.current = `Affected release 5.6.${patch} registration`;
        await submitCallTx(wallet.providers, {
          compiledContract: CompiledCommonVeilContract,
          contractAddress,
          privateStateId: PRIVATE_STATE_ID,
          circuitId: 'registerAffectedRelease',
          args: [adminSecret.current, digest, productId, 5n, 6n, patch],
        });
      }
      erase(adminSecret.current); adminSecret.current = undefined;
      setAdvisoryId(digest); setStage('ready');
    } catch (reason) { fail(reason); }
  };

  const certifyInventory = async () => {
    if (!wallet || !contractAddress || !certifierSecret.current || !memberCredential.current) return;
    setStage('certifying'); setError('');
    const nextSnapshotSalt = crypto.getRandomValues(new Uint8Array(32));
    try {
      const productId = await productDigest(POLICY_PRODUCT);
      pendingEvidenceLabel.current = 'Authorized inventory certification';
      await submitCallTx(wallet.providers, {
        compiledContract: CompiledCommonVeilContract,
        contractAddress,
        privateStateId: PRIVATE_STATE_ID,
        circuitId: 'certifyInventory',
        args: [certifierSecret.current, memberCredential.current, productId, 5n, 6n, BigInt(inventoryPatch), nextSnapshotSalt],
      });
      snapshotSalt.current = nextSnapshotSalt;
      erase(certifierSecret.current); certifierSecret.current = undefined;
      erase(memberCredential.current); memberCredential.current = undefined;
      setInventoryCommitted(true); setStage('certified');
    } catch (reason) {
      erase(nextSnapshotSalt);
      fail(reason);
    }
  };

  const attest = async () => {
    if (!wallet || !contractAddress || !advisoryId || !memberSecret.current || !memberSalt.current || !snapshotSalt.current) return;
    setStage('proving'); setError('');
    try {
      const productId = await productDigest(POLICY_PRODUCT);
      pendingEvidenceLabel.current = 'Private affected-release proof';
      await submitCallTx(wallet.providers, {
        compiledContract: CompiledCommonVeilContract,
        contractAddress,
        privateStateId: PRIVATE_STATE_ID,
        circuitId: 'attest',
        args: [advisoryId, memberSecret.current, memberSalt.current, productId, 5n, 6n, BigInt(inventoryPatch), snapshotSalt.current],
      });
      erase(memberSecret.current); erase(memberSalt.current); erase(snapshotSalt.current);
      memberSecret.current = undefined; memberSalt.current = undefined;
      snapshotSalt.current = undefined;
      setPublicState(await readPublicState(wallet.providers, contractAddress, publicState.accepted + 1n));
      setStage('verified');
    } catch (reason) { fail(reason); }
  };

  return (
    <main>
      <nav>
        <a className="brand" href="#top" aria-label="CommonVeil home"><span>CV</span> CommonVeil</a>
        <div className="nav-links">
          <a href="#protocol">Protocol</a><a href="#demo">Live demo</a><a href="#evidence">Evidence</a>
          <a href="/?role=registrar" title="Open Registrar Workspace">Registrar</a>
          <a href="/?role=certifier" title="Open Certifier Workspace">Certifier</a>
          <a href="/?role=member" title="Open Member Workspace">Member</a>
          <a className="repo-link" href="https://github.com/0xaje/CommonVeil" target="_blank" rel="noreferrer">GitHub ↗</a>
        </div>
      </nav>

      <header id="top" className="hero">
        <div className="hero-copy">
          <div className="eyebrow">MIDNIGHT PREPROD · CV-005</div>
          <h1>Prove exposure.<br /><span>Keep inventory private.</span></h1>
          <p>CommonVeil lets an admitted organization prove that an authorized pre-policy inventory snapshot is affected—without publishing its identity, product, or version.</p>
          <div className="hero-actions"><a className="primary-link" href="#demo">Run verified flow</a><a className="secondary-link" href="#evidence">Inspect evidence</a></div>
        </div>
        <aside className="proof-card">
          <div className="proof-top"><span className="pulse" /> Verified on Preprod</div>
          <div className="proof-number">1</div><div className="proof-caption">accepted private report</div>
          <div className="proof-rows"><span>Member identity <b>Hidden</b></span><span>Inventory value <b>Hidden</b></span><span>Duplicate report <b>Rejected</b></span></div>
        </aside>
      </header>

      <section id="protocol" className="section-heading"><div className="eyebrow">THE PROTOCOL</div><h2>Useful coordination without public exposure lists.</h2><p>Every accepted report satisfies four Compact-enforced conditions.</p></section>

      <section className="explainer" aria-label="Protocol guarantees">
        <div><small>Proves</small><strong>Admitted member + certified snapshot + exact affected release</strong></div>
        <div><small>Publishes</small><strong>Commitments, scoped nullifier, and aggregate count</strong></div>
        <div><small>Does not publish</small><strong>Member identity, product, version, or private salts</strong></div>
      </section>

      <section className="role-flow">
        <div><span>01</span><h3>Registrar</h3><p>Admits an opaque member credential and registers the exact affected-release policy.</p></div>
        <div><span>02</span><h3>Certifier</h3><p>Commits salted private inventory for that credential before policy activation.</p></div>
        <div><span>03</span><h3>Member</h3><p>Proves the certified snapshot matches the affected set without revealing its value.</p></div>
        <div><span>04</span><h3>Contract</h3><p>Rejects outsiders, late certification, mismatches, and advisory replay.</p></div>
      </section>

      <section className="boundary">
        <strong>Honest demonstration boundary</strong>
        <p>Registrar, certifier, and member authorities are cryptographically distinct, but this Preprod demo runs them in one browser. It does not claim production scanner or device attestation.</p>
      </section>

      <section id="demo" className="section-heading demo-heading"><div className="eyebrow">LIVE PROTOCOL DEMO</div><h2>Six real Midnight transactions. No mocked backend.</h2><p>Connect a funded Preprod wallet to execute a fresh run, or inspect the verified reference run below.</p></section>

      <section className="status-card">
        <span className={`dot ${stage}`} />
        <div><small>Current stage</small><strong>{statusLabel}</strong></div>
      </section>

      <section className="grid">
        <article>
          <div className="step">01</div><h2>Connect wallet</h2>
          <p>Authorize a standard Midnight Connector v4 wallet on Preprod.</p>
          <button onClick={connect} disabled={busy || !!wallet}>{wallet ? 'Connected' : 'Connect 1AM'}</button>
          {wallet && <dl><dt>Wallet</dt><dd>{wallet.name}</dd><dt>Address</dt><dd title={wallet.address}>{short(wallet.address)}</dd><dt>DUST</dt><dd>{formatDust(wallet.dustBalance)}</dd><dt>Proving</dt><dd>{wallet.proofMode === 'wallet' ? 'In wallet' : 'Local :6300'}</dd></dl>}
        </article>

        <article>
          <div className="step">02</div><h2>Deploy registrar</h2>
          <p>Create independent registrar and certifier secrets locally and bind both derived public keys into the contract constructor.</p>
          <button onClick={deploy} disabled={busy || !wallet || !!contractAddress}>{contractAddress ? 'Deployed' : 'Deploy CV-005'}</button>
          {contractAddress && <dl><dt>Contract</dt><dd title={contractAddress}>{short(contractAddress)}</dd></dl>}
        </article>

        <article>
          <div className="step">03</div><h2>Admit member</h2>
          <p>Generate a private member secret and salt. The registrar publishes only their opaque credential commitment.</p>
          <button onClick={enroll} disabled={busy || !contractAddress || memberAdmitted}>{memberAdmitted ? 'Member admitted' : 'Admit demo member'}</button>
          <dl><dt>Secret published</dt><dd>No</dd><dt>Salt published</dt><dd>No</dd></dl>
        </article>

        <article>
          <div className="step">04</div><h2>Certify private inventory</h2>
          <p>The authorized certifier commits controlled demonstration inventory for the admitted opaque credential before policy activation.</p>
          <label htmlFor="version">Private demonstration version</label>
          <select id="version" value={inventoryPatch} onChange={(event) => setInventoryPatch(event.target.value as '0' | '1')} disabled={busy || inventoryCommitted}>
            <option value="0">XZ Utils 5.6.0</option>
            <option value="1">XZ Utils 5.6.1</option>
          </select>
          <button onClick={certifyInventory} disabled={busy || !memberAdmitted || inventoryCommitted}>{inventoryCommitted ? 'Inventory certified' : 'Certify inventory snapshot'}</button>
          <dl><dt>Product/version</dt><dd>Not published</dd><dt>Certifier role</dt><dd>Authorized key</dd></dl>
        </article>

        <article>
          <div className="step">05</div><h2>Register affected releases</h2>
          <p>Register the exact public policy: XZ Utils release tarballs 5.6.0 and 5.6.1 for CVE-2024-3094.</p>
          <label htmlFor="advisory">Advisory identifier</label>
          <input id="advisory" value={advisoryLabel} onChange={(event) => setAdvisoryLabel(event.target.value)} placeholder={POLICY_ADVISORY} disabled={busy || !!advisoryId} />
          <button onClick={registerAdvisory} disabled={busy || !inventoryCommitted || advisoryLabel.trim() !== POLICY_ADVISORY || !!advisoryId}>{advisoryId ? 'Policy registered' : 'Register exact policy'}</button>
          {advisoryId && <dl><dt>Scope hash</dt><dd title={bytesToHex(advisoryId)}>{short(bytesToHex(advisoryId))}</dd></dl>}
        </article>

        <article>
          <div className="step">06</div><h2>Prove certified exposure</h2>
          <p>Prove the certifier-originated private snapshot matches the active affected-release policy and emit one advisory-scoped nullifier.</p>
          <button onClick={attest} disabled={busy || !advisoryId || stage === 'verified'}>{stage === 'verified' ? 'Verified' : 'Generate & submit proof'}</button>
          <dl><dt>Accepted reports</dt><dd>{publicState.accepted.toString()}</dd><dt>Used nullifiers</dt><dd>{publicState.nullifiers.toString()}</dd><dt>Inventory value</dt><dd>Not published</dd></dl>
        </article>
      </section>

      {evidence.length > 0 && <section className="evidence"><div className="evidence-title"><div><small>CURRENT SESSION</small><h2>Network evidence</h2></div><span className="evidence-badge">Submitted by connected wallet</span></div>{evidence.map(({ label, txId }) => <div key={txId}><span>{label}</span><code>{txId}</code></div>)}</section>}
      {error && <section className="error"><strong>Stopped safely</strong><p>{error}</p></section>}

      <section id="evidence" className="section-heading evidence-heading"><div className="eyebrow">VERIFIED REFERENCE RUN</div><h2>Recorded, reproducible, and inspectable.</h2><p>These identifiers came from the completed CV-005 Preprod run—not placeholders or simulated transactions.</p></section>
      <section className="evidence reference-evidence">
        <div className="reference-summary"><div><strong>1</strong><span>Accepted report</span></div><div><strong>1</strong><span>Used nullifier</span></div><div><strong>6</strong><span>Finalized transactions</span></div></div>
        {VERIFIED_REFERENCE_EVIDENCE.map(({ label, txId }) => <div key={txId}><span>{label}</span><code>{txId}</code></div>)}
      </section>

      <section className="closing"><div><div className="eyebrow">CURRENT SCOPE</div><h2>A verified privacy protocol—not a pretend production scanner.</h2></div><p>CommonVeil CV-005 proves authorization, pre-policy certification, exact affected-set membership, and duplicate prevention. Independent scanner deployment, hardware-backed measurement, and multi-organization operations remain explicit production work.</p></section>

      <footer><span>CommonVeil · Built on Midnight Preprod</span><span>Separate certifier key enforced · Inventory value remains private</span></footer>
    </main>
  );
}

async function readPublicState(
  providers: CommonVeilProviders,
  address: ContractAddress,
  minimumAccepted: bigint,
): Promise<PublicState> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const state = await providers.publicDataProvider.queryContractState(address);
    if (state) {
      const value = CommonVeil.ledger(state.data);
      if (value.accepted >= minimumAccepted && value.usedNullifiers.size() >= minimumAccepted) {
        return {
          accepted: value.accepted,
          members: value.memberCredentials.size(),
          affectedReleases: value.affectedReleases.size(),
          inventoryCommitments: value.inventoryCommitments.size(),
          nullifiers: value.usedNullifiers.size(),
        };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }
  throw new Error('The attestation transaction was submitted, but the indexer has not exposed the updated contract state yet.');
}
