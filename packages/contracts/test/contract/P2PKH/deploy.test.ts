import { PrivKeyConnector } from "@bch-wc2/privkey-connector";
import { MockNetworkProvider, randomUtxo } from "cashscript";
import { P2PKH } from "../../../src/contract/P2PKH/P2PKH.js";
import { aliceAddress, alicePriv, MockWallet } from "../../shared.js";

describe("Deployment tests", () => {
  test("Should deploy the contract", async () => {
    const provider = new MockNetworkProvider();
    provider.reset();
    provider.addUtxo(aliceAddress, randomUtxo({
      satoshis: 10000000n,
    }));

    const wallet = await MockWallet(provider, alicePriv);

    const connector = new PrivKeyConnector({
      privateKey: wallet.privateKey,
      pubkeyCompressed: wallet.publicKeyCompressed,
      networkProvider: provider
    });

    const p2pkh = await P2PKH.deploy({
      value: 10000n,
      wallet, provider, connector,
    });

    expect(p2pkh.contract).toBeDefined();
    expect(p2pkh.connector).toBeDefined();

    const utxos = await p2pkh.contract.getUtxos();
    expect(utxos).toHaveLength(1);
    expect(utxos[0].satoshis).toBe(10000n);
  });
});
