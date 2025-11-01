import { IConnector } from '@bch-wc2/interfaces';
import { WrapWallet } from '@bch-wc2/mainnet-js-signer';
import { Contract, NetworkProvider } from "cashscript";
import { BaseWallet, SendRequest } from "mainnet-js";
import P2PKHArtifact from "../../../artifacts/P2PKH.artifact.js";

export const deploy = async ({
  wallet,
  provider,
  connector,
  value,
} : {
  wallet: BaseWallet,
  provider: NetworkProvider,
  connector: IConnector,
  value: bigint,
}) => {
  if (value < 1000n) {
    throw new Error("Value must be at least 1000 satoshis to deploy the contract.");
  }

  const signer = WrapWallet(wallet, connector);

  const p2pkhContract = new Contract(P2PKHArtifact, [wallet.getPublicKeyHash()], { provider, addressType: "p2sh20" });

  // "deploy" contract by sending some BCH value
  await signer.send(new SendRequest({
    cashaddr: p2pkhContract.address,
    value: Number(value),
    unit: "satoshis",
  }), {
    userPrompt: `Sign to deploy a contract`,
  });

  return p2pkhContract;
}
