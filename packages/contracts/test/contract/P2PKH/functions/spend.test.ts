import { PrivKeyConnector } from "@bch-wc2/privkey-connector";
import { MockNetworkProvider, randomUtxo, Utxo } from "cashscript";
import { aliceAddress, alicePriv, bobAddress, MockWallet } from "../../../shared.js";
import { P2PKH } from "../../../../src/contract/P2PKH/P2PKH.js";

describe("Spend tests", () => {
  test("Should spend some funds (all utxos)", async () => {
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

    // showuld throw if trying to deploy with less than 1000 satoshis
    await expect(P2PKH.deploy({
      value: 900n,
      wallet, provider, connector,
    })).rejects.toThrow();

    const p2pkh = await P2PKH.deploy({
      value: 10000n,
      wallet, provider, connector,
    });

    // send more funds to the contract so that we have 2 utxos
    await wallet.send({
      cashaddr: p2pkh.contract.address,
      value: 20000,
      unit: "satoshis",
    });

    expect(await p2pkh.contract.getBalance()).toBe(30000n);

    // spend using 2 utxos
    const spendResult = await p2pkh.spend({
      destination: bobAddress,
      value: 25000n,
    });

    // check bob received funds
    const bobUtxos = await provider.getUtxos(bobAddress);
    expect(bobUtxos).toHaveLength(1);
    expect(bobUtxos[0].satoshis).toBe(25000n);

    // check remaining balance in contract
    const contractUtxos = await p2pkh.contract.getUtxos();
    expect(contractUtxos).toHaveLength(1);
    expect(await p2pkh.contract.getBalance()).toBeGreaterThan(4000n); // after fees
  });

  test("Should spend all funds", async () => {
    // simpler way to "deploy" on MockNet
    const provider = new MockNetworkProvider();
    provider.reset();

    const wallet = await MockWallet(provider, alicePriv);

    const connector = new PrivKeyConnector({
      privateKey: wallet.privateKey,
      pubkeyCompressed: wallet.publicKeyCompressed,
      networkProvider: provider
    });

    const p2pkh = new P2PKH({
      wallet, provider, connector,
    });

    provider.addUtxo(p2pkh.contract.address, randomUtxo({
      satoshis: 10000n,
    }));

    provider.addUtxo(p2pkh.contract.address, randomUtxo({
      satoshis: 20000n,
    }));

    expect(await p2pkh.contract.getBalance()).toBe(30000n);

    // spend all funds
    const spendResult = await p2pkh.spend({
      destination: bobAddress,
      value: 30000n,
    });

    // check bob received funds
    const bobUtxos = await provider.getUtxos(bobAddress);
    expect(bobUtxos).toHaveLength(1);
    expect(bobUtxos[0].satoshis).toBeGreaterThan(29000n);

    // check remaining balance in contract
    const contractUtxos = await p2pkh.contract.getUtxos();
    expect(contractUtxos).toHaveLength(0);
    expect(await p2pkh.contract.getBalance()).toBe(0n); // after fees
  });
});
