import { useP2PKHContract } from "@/hooks/useP2PKHContract";
import { useWatchAddress } from "@/hooks/useWatchAddress";
import { IConnector } from "@bch-wc2/interfaces";
import { useCallback, useRef } from "react";

export default function P2PKHView({
  address, connector, showError, showInfo
} : {
  address: string | undefined, connector: IConnector | undefined, showError: (message: string) => void, showInfo: (message: string) => void,
}) {
  const { p2pkh, P2PKH } = useP2PKHContract(address, connector);
  const { utxos } = useWatchAddress(p2pkh?.contract?.address);
  const recipientValueRef = useRef<HTMLInputElement>(null);
  const spendValueRef = useRef<HTMLInputElement>(null);
  const deployValueRef = useRef<HTMLInputElement>(null);

  const deployContract = useCallback(async () => {
    if (!p2pkh || !deployValueRef) {
      return;
    }

    try {
      const value = BigInt(Math.ceil(deployValueRef.current?.valueAsNumber ?? 0));

      await P2PKH.deploy({
        wallet: p2pkh.wallet,
        provider: p2pkh.contract.provider,
        connector: p2pkh.connector,
        value: value,
      });
      showInfo(`Contract deployed successfully!`);
    } catch (err) {
      showError(`Failed to deploy contract: ${(err as Error).message}`);
    }
  }, [deployValueRef, p2pkh]);

  const spendFromContract = useCallback(async () => {
    if (!p2pkh || !spendValueRef) {
      return;
    }

    try {
      const value = BigInt(Math.ceil(spendValueRef.current?.valueAsNumber ?? 0));
      const recipient = recipientValueRef.current?.value;

      await p2pkh.spend({
        destination: recipient ?? "",
        value: value,
      });
      showInfo(`Successfully spent ${value} satoshis to ${recipient}`);
    } catch (err) {
      showError(`Failed to deploy contract: ${(err as Error).message}`);
    }
  }, [spendValueRef, p2pkh]);

  return (
    <div>
      {p2pkh && address && `Your personal contract address: ${p2pkh.contract.address}`}
      {p2pkh && address && !utxos?.length && (
        <div>No UTXOs found at contract address</div>
      )}
      {(utxos?.length ?? 0) > 0 && (
        <div>
          <h2 className="text-xl mt-4 mb-2">UTXOs at Contract Address:</h2>
          <ul>
            {utxos?.map((utxo, index) => (
              <li key={index} className="mb-2 flex flex-row gap-2">
                <div>#{index}</div>
                <div>Outpoint: {utxo.txid.slice(0, 8)}...{utxo.txid.slice(-8)}:{utxo.vout}</div>
                <div>Value: {utxo.satoshis} satoshis</div>
              </li>
            ))}
          </ul>

          <div>Spend from contract</div>
          <div className="flex flex-row">
            <input ref={spendValueRef} defaultValue={1000} type="number" placeholder="Amount in satoshis" id="amountInput" className="border p-2 rounded-md mr-2 mt-2 text-black" />
            <input ref={recipientValueRef} defaultValue={address} placeholder="Recipient" id="recipientInput" className="border p-2 rounded-md mr-2 mt-2 text-black" />
            <button
              onClick={spendFromContract}
              className="px-4 py-2 rounded-md font-bold text-white text-sm transition-colors bg-black hover:bg-gray-700 cursor-pointer mt-2"
            >
              Spend
            </button>
          </div>

        </div>
      )}
      {address && <><hr className="my-4" />
        <div>{`${!utxos?.length ? 'Deploy new contract instance' : 'Deploy more contract instances'}`}</div>
        <div className="flex flex-row">
          <input ref={deployValueRef} defaultValue={1000} type="number" placeholder="Amount in satoshis" id="amountInput" className="border p-2 rounded-md mr-2 mt-2 text-black" />
          <button
            onClick={deployContract}
            className="px-4 py-2 rounded-md font-bold text-white text-sm transition-colors bg-black hover:bg-gray-700 cursor-pointer mt-2"
          >
            Deploy
          </button>
        </div>
      </>}
    </div>
  )
}