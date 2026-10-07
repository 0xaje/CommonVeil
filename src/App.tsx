import { useEffect, useMemo, useRef, useState } from 'react';
import { deployContract, submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { CompiledCommonVeilContract, CommonVeil } from './contract';
import { connectProviders, PRIVATE_STATE_ID, type CommonVeilProviders, type ConnectedWallet } from './providers';

type Stage =
  | 'idle' | 'connecting' | 'connected' | 'deploying' | 'deployed'
  | 'enrolling' | 'enrolled' | 'registering' | 'ready'
  | 'proving' | 'verified' | 'failed';

type Evidence = { readonly label: string; readonly txId: string };
type PublicState = {
  readonly accepted: bigint;
  readonly members: bigint;
  readonly advisories: bigint;
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

export default function App() {
  const [stage, setStage] = useState<Stage>('idle');
  const [wallet, setWallet] = useState<ConnectedWallet>();
  const [contractAddress, setContractAddress] = useState<ContractAddress>();
  const [memberAdmitted, setMemberAdmitted] = useState(false);
  const [advisoryLabel, setAdvisoryLabel] = useState('');
  const [advisoryId, setAdvisoryId] = useState<Uint8Array>();
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [publicState, setPublicState] = useState<PublicState>({ accepted: 0n, members: 0n, advisories: 0n, nullifiers: 0n });
  const [error, setError] = useState('');

  const adminSecret = useRef<Uint8Array | undefined>(undefined);
  const memberSecret = useRef<Uint8Array | undefined>(undefined);
  const memberSalt = useRef<Uint8Array | undefined>(undefined);
  const pendingEvidenceLabel = useRef('Transaction');
  const busy = ['connecting', 'deploying', 'enrolling', 'registering', 'proving'].includes(stage);

  useEffect(() => () => {
    erase(adminSecret.current);
    erase(memberSecret.current);
    erase(memberSalt.current);
  }, []);

  const statusLabel = useMemo(() => ({
    idle: 'Ready to connect',
    connecting: 'Waiting for wallet approval',
    connected: 'Wallet connected',
    deploying: 'Deploying registrar-bound contract',
    deployed: 'Contract deployed',
    enrolling: 'Admitting opaque member credential',
    enrolled: 'Member credential admitted',
    registering: 'Registering public advisory scope',
    ready: 'Ready for private membership proof',
    proving: 'Generating membership and nullifier proof',
    verified: 'Private member attestation verified',
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
    try {
      const adminKey = CommonVeil.pureCircuits.deriveAdminKey(nextAdminSecret);
      pendingEvidenceLabel.current = 'Deployment';
      const deployed = await deployContract(wallet.providers, {
        compiledContract: CompiledCommonVeilContract,
        privateStateId: PRIVATE_STATE_ID,
        initialPrivateState: {},
        args: [adminKey],
      });
      const address = deployed.deployTxData.public.contractAddress;
      wallet.providers.privateStateProvider.setContractAddress(address);
      adminSecret.current = nextAdminSecret;
      setContractAddress(address); setStage('deployed');
    } catch (reason) {
      erase(nextAdminSecret);
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
      setMemberAdmitted(true); setStage('enrolled');
    } catch (reason) {
      erase(nextMemberSecret); erase(nextMemberSalt);
      fail(reason);
    }
  };

  const registerAdvisory = async () => {
    if (!wallet || !contractAddress || !adminSecret.current || !memberAdmitted) return;
    setStage('registering'); setError('');
    try {
      const digest = await advisoryDigest(advisoryLabel);
      pendingEvidenceLabel.current = 'Advisory registration';
      await submitCallTx(wallet.providers, {
        compiledContract: CompiledCommonVeilContract,
        contractAddress,
        privateStateId: PRIVATE_STATE_ID,
        circuitId: 'registerAdvisory',
        args: [adminSecret.current, digest],
      });
      erase(adminSecret.current); adminSecret.current = undefined;
      setAdvisoryId(digest); setStage('ready');
    } catch (reason) { fail(reason); }
  };

  const attest = async () => {
    if (!wallet || !contractAddress || !advisoryId || !memberSecret.current || !memberSalt.current) return;
    setStage('proving'); setError('');
    try {
      pendingEvidenceLabel.current = 'Private attestation';
      await submitCallTx(wallet.providers, {
        compiledContract: CompiledCommonVeilContract,
        contractAddress,
        privateStateId: PRIVATE_STATE_ID,
        circuitId: 'attest',
        args: [advisoryId, memberSecret.current, memberSalt.current],
      });
      erase(memberSecret.current); erase(memberSalt.current);
      memberSecret.current = undefined; memberSalt.current = undefined;
      setPublicState(await readPublicState(wallet.providers, contractAddress, publicState.accepted + 1n));
      setStage('verified');
    } catch (reason) { fail(reason); }
  };

  return (
    <main>
      <header>
        <div className="eyebrow">COMMONVEIL · CV-002</div>
        <h1>Prove membership. Prevent duplicate disclosure.</h1>
        <p>An admitted member privately proves eligibility for a registered advisory while publishing only an advisory-scoped nullifier on Midnight Preprod.</p>
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
          <p>Create a fresh registrar secret locally and bind its derived public key into the contract constructor.</p>
          <button onClick={deploy} disabled={busy || !wallet || !!contractAddress}>{contractAddress ? 'Deployed' : 'Deploy CV-002'}</button>
          {contractAddress && <dl><dt>Contract</dt><dd title={contractAddress}>{short(contractAddress)}</dd></dl>}
        </article>

        <article>
          <div className="step">03</div><h2>Admit member</h2>
          <p>Generate a private member secret and salt. The registrar publishes only their opaque credential commitment.</p>
          <button onClick={enroll} disabled={busy || !contractAddress || memberAdmitted}>{memberAdmitted ? 'Member admitted' : 'Admit demo member'}</button>
          <dl><dt>Secret published</dt><dd>No</dd><dt>Salt published</dt><dd>No</dd></dl>
        </article>

        <article>
          <div className="step">04</div><h2>Register advisory</h2>
          <p>Enter a real public advisory identifier. CommonVeil hashes it to the canonical 32-byte scope registered on-chain.</p>
          <label htmlFor="advisory">Advisory identifier</label>
          <input id="advisory" value={advisoryLabel} onChange={(event) => setAdvisoryLabel(event.target.value)} placeholder="e.g. a real CVE or vendor advisory ID" disabled={busy || !!advisoryId} />
          <button onClick={registerAdvisory} disabled={busy || !memberAdmitted || !advisoryLabel.trim() || !!advisoryId}>{advisoryId ? 'Advisory registered' : 'Register advisory'}</button>
          {advisoryId && <dl><dt>Scope hash</dt><dd title={bytesToHex(advisoryId)}>{short(bytesToHex(advisoryId))}</dd></dl>}
        </article>

        <article>
          <div className="step">05</div><h2>Prove private membership</h2>
          <p>Prove the admitted credential and emit one nullifier for this advisory without revealing the member secret.</p>
          <button onClick={attest} disabled={busy || !advisoryId || stage === 'verified'}>{stage === 'verified' ? 'Verified' : 'Generate & submit proof'}</button>
          <dl><dt>Accepted reports</dt><dd>{publicState.accepted.toString()}</dd><dt>Used nullifiers</dt><dd>{publicState.nullifiers.toString()}</dd><dt>Member identity</dt><dd>Not published</dd></dl>
        </article>
      </section>

      {evidence.length > 0 && <section className="evidence"><h2>Network evidence</h2>{evidence.map(({ label, txId }) => <div key={txId}><span>{label}</span><code>{txId}</code></div>)}</section>}
      {error && <section className="error"><strong>Stopped safely</strong><p>{error}</p></section>}
      <footer>Network: Midnight Preprod · Registrar, member secret, and salt remain inside this browser session.</footer>
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
          advisories: value.advisories.size(),
          nullifiers: value.usedNullifiers.size(),
        };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }
  throw new Error('The attestation transaction was submitted, but the indexer has not exposed the updated contract state yet.');
}
