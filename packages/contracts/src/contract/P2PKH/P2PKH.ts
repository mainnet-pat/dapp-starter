import type { IConnector } from '@bch-wc2/interfaces';
import { Contract, NetworkProvider } from 'cashscript';
import { BaseWallet } from 'mainnet-js';
import P2PKHArtifact from '../../../artifacts/P2PKH.artifact.js';
import { deploy } from './deploy';
import { spend } from './functions/spend.js';

export class P2PKH {
  public connector: IConnector;
  public wallet: BaseWallet;

  public contract: Contract<typeof P2PKHArtifact>;

  static async deploy({
    wallet,
    provider,
    connector,
    value,
  }: {
    wallet: BaseWallet;
    provider: NetworkProvider;
    connector: IConnector;
    value: bigint;
  }) {
    const contract = await deploy({
      provider: provider,
      wallet: wallet,
      connector: connector,
      value: value
    });

    return new P2PKH({
      wallet,
      provider,
      connector,
      contract,
    });
  }

  constructor({
    wallet,
    provider,
    connector,
    contract,
  } : {
    wallet: BaseWallet;
    provider: NetworkProvider;
    connector: IConnector;
    contract?: Contract<typeof P2PKHArtifact>;
  }) {
    this.wallet = wallet;
    this.connector = connector;

    this.contract = contract ?? new Contract<typeof P2PKHArtifact>(
      P2PKHArtifact,
      [wallet.getPublicKeyHash()],
      { provider, addressType: 'p2sh20' },
    );
  }

  async spend({
    destination,
    value,
  } : {
    destination: string,
    value: bigint,
  }) {
    return spend({
      destination,
      value: Number(value),
      wallet: this.wallet,
      provider: this.contract.provider,
      connector: this.connector,
    });
  }
}
