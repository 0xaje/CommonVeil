import { useMemo, useState } from 'react';
import { deployContract, submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { CompiledCommonVeilContract, CommonVeil } from './contract';
import { connectProviders, PRIVATE_STATE_ID, type CommonVeilProviders, type ConnectedWallet } from './providers';

type Stage = 'idle' | 'connecting' | 'connected' | 'deploying' | 'deployed' | 'proving' | 'verified' | 'failed';

const short = (value: string) => value.length > 22 ? `${value.slice(0, 12)}…${value.slice(-8)}` : value;
const formatDust = (raw: bigint) => {
  const whole = raw / 1_000_000_000_000_000n;
  const fraction = (raw % 1_000_000_000_000_000n).toString().padStart(15, '0').slice(0, 4);
  return `${whole}.${fraction}`;
};

export default function App() {
  const [stage, setStage] = useState<Stage>('idle');
  const [wallet, setWallet] = useState<ConnectedWallet>();
  const [contractAddress, setContractAddress] = useState<ContractAddress>();
  const [txIds, setTxIds] = useState<string[]>([]);
  const [accepted, setAccepted] = useState<bigint>(0n);
  const [error, setError] = useState('');
  const busy = ['connecting', 'deploying', 'proving'].includes(stage);
  const statusLabel = useMemo(() => ({
    idle: 'Ready to connect', connecting: 'Waiting for wallet approval', connected: 'Wallet connected',
    deploying: 'Submitting contract deployment', deployed: 'Contract deployed', proving: 'Generating private proof',
    verified: 'Private attestation verified', failed: 'Operation failed',
  }[stage]), [stage]);

  const fail = (reason: unknown) => {
    console.error(reason);
    setError(reason instanceof Error ? reason.message : String(reason));
    setStage('failed');
  };

  const connect = async () => {
    setStage('connecting'); setError('');
    try {
      const connected = await connectProviders((txId) => setTxIds((current) => [...current, txId]));
      setWallet(connected); setStage('connected');
    } catch (reason) { fail(reason); }
  };

  const deploy = async () => {
    if (!wallet) return;
    setStage('deploying'); setError('');
    try {
      const deployed = await deployContract(wallet.providers, {
        compiledContract: CompiledCommonVeilContract,
        privateStateId: PRIVATE_STATE_ID,
        initialPrivateState: {},
      });
      const address = deployed.deployTxData.public.contractAddress;
      wallet.providers.privateStateProvider.setContractAddress(address);
      setContractAddress(address); setStage('deployed');
    } catch (reason) { fail(reason); }
  };

  const attest = async () => {
    if (!wallet || !contractAddress) return;
    setStage('proving'); setError('');
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const salt = crypto.getRandomValues(new Uint8Array(32));
    try {
      await submitCallTx(wallet.providers, {
        compiledContract: CompiledCommonVeilContract,
        contractAddress,
        privateStateId: PRIVATE_STATE_ID,
        circuitId: 'attest',
        args: [secret, salt],
      });
      const state = await readAccepted(wallet.providers, contractAddress);
      setAccepted(state); setStage('verified');
    } catch (reason) { fail(reason); }
    finally { secret.fill(0); salt.fill(0); }
  };

  return (
    <main>
      <header>
        <div className="eyebrow">COMMONVEIL · CV-001</div>
        <h1>Private input. Publicly verifiable result.</h1>
        <p>This engineering surface deploys the real Compact contract and submits one private commitment on Midnight Preprod.</p>
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
          <div className="step">02</div><h2>Deploy contract</h2>
          <p>Publish the compiled CommonVeil contract to Midnight Preprod.</p>
          <button onClick={deploy} disabled={busy || !wallet || !!contractAddress}>{contractAddress ? 'Deployed' : 'Deploy CommonVeil'}</button>
          {contractAddress && <dl><dt>Contract</dt><dd title={contractAddress}>{short(contractAddress)}</dd></dl>}
        </article>
        <article>
          <div className="step">03</div><h2>Prove private input</h2>
          <p>Create a fresh secret and salt locally, prove the commitment, then overwrite the input buffers after submission.</p>
          <button onClick={attest} disabled={busy || !contractAddress}>Generate & submit proof</button>
          <dl><dt>Accepted commitments</dt><dd>{accepted.toString()}</dd><dt>Secret published</dt><dd>No</dd><dt>Salt published</dt><dd>No</dd></dl>
        </article>
      </section>

      {txIds.length > 0 && <section className="evidence"><h2>Network evidence</h2>{txIds.map((txId, index) => <div key={txId}><span>{index === 0 ? 'Deployment' : 'Attestation'}</span><code>{txId}</code></div>)}</section>}
      {error && <section className="error"><strong>Stopped safely</strong><p>{error}</p></section>}
      <footer>Network: Midnight Preprod · Raw private inputs remain inside this browser session.</footer>
    </main>
  );
}

async function readAccepted(providers: CommonVeilProviders, address: ContractAddress): Promise<bigint> {
  const state = await providers.publicDataProvider.queryContractState(address);
  if (!state) throw new Error('The deployed contract is not indexed yet. Wait a few seconds and retry.');
  return CommonVeil.ledger(state.data).accepted;
}
