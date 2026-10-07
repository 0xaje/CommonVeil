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

export default function App() {
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
      <header>
        <div className="eyebrow">COMMONVEIL · CV-005</div>
        <h1>Certify inventory before the advisory. Prove exposure privately.</h1>
        <p>A separate authorized certifier anchors an admitted member's private inventory before policy activation. The member later proves that snapshot is affected.</p>
      </header>

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

      {evidence.length > 0 && <section className="evidence"><h2>Network evidence</h2>{evidence.map(({ label, txId }) => <div key={txId}><span>{label}</span><code>{txId}</code></div>)}</section>}
      {error && <section className="error"><strong>Stopped safely</strong><p>{error}</p></section>}
      <footer>Network: Midnight Preprod · Separate certifier key enforced; production scanner integration remains outside this milestone.</footer>
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
