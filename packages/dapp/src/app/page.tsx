"use client";

import ConnectButton from "@/components/ConnectButton";
import FinishTransactionModal from "@/components/FinishTransactionModal";
import P2PKHView from "@/components/P2PKHView";
import { IConnector, WcSignTransactionRequest } from "@bch-wc2/interfaces";
import { useWeb3ModalConnectorContext } from "@bch-wc2/web3modal-connector";
import { decodeTransaction, hexToBin } from "@bitauth/libauth";
import { useCallback, useMemo, useState } from "react";

export default function Home() {
  const { connector, address } = useWeb3ModalConnectorContext();
  const wrappedConnector = useMemo(() => connector ? {
    ...connector,
    signTransaction: async (options: WcSignTransactionRequest) => {
      setShowFinishTransactionModal(true);
      setFinishTransactionMessage(options.userPrompt || "Sign transaction");
      try {
        if (typeof options.transaction === "string") {
          options.transaction = decodeTransaction(hexToBin(options.transaction));
        }
        const result = await connector.signTransaction(options);
        return result;
      } catch (e: any) {
        console.error(e);
        showError(`Unable to sign transaction: ${e.message}`);
      } finally {
        setShowFinishTransactionModal(false);
        setFinishTransactionMessage("");
      }
    },
  } : undefined as IConnector | undefined, [connector]);


  const [showFinishTransactionModal, setShowFinishTransactionModal] = useState<boolean>(false);
  const [finishTransactionMessage, setFinishTransactionMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");

  const showError = useCallback((message: string) => {
    setError(message);
    setTimeout(() => setError(""), 10000);
  }, []);

  const showInfo = useCallback((message: string) => {
    setInfo(message);
    setTimeout(() => setInfo(""), 10000);
  }, []);

  return (
    <div>
      {showFinishTransactionModal && <FinishTransactionModal
        onClose={() => setShowFinishTransactionModal(false)}
        message={finishTransactionMessage}
        ></FinishTransactionModal>}
      {(error.length > 0 || info.length > 0) &&
        <div className={`fixed z-40 top-0 flex justify-center w-full py-3`}>
          {error.length > 0 && <div onClick={() => setError("")} className="break-all md:break-normal mx-3 mb-4 rounded-lg border-red-300 border-solid border-2 bg-red-100 px-6 py-5 text-base text-red-700" role="alert">{error}</div>}
          {info.length > 0 && <div onClick={() => setInfo("")} className="break-all md:break-normal mx-3 mb-4 rounded-lg border-green-300 border-solid border-2 bg-green-100 px-6 py-5 text-base text-green-700" role="alert">{info}</div>}
        </div>
      }
      <div className="flex flex-col min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <header className="flex w-full max-w-3xl pt-5 bg-white dark:bg-black sm:items-start">
          <div className="flex flex-col w-[95%]">
            <div className="flex flex-row justify-center text-3xl mt-2 mb-5">BCH dApp quickstarter</div>
            <ConnectButton />
          </div>
        </header>
        <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
          <P2PKHView
            address={address}
            connector={wrappedConnector}
            showError={showError}
            showInfo={showInfo}
          />
        </main>
      </div>
    </div>
  );
}
