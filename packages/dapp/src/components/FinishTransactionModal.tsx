export default function FinishTransactionModal ({ onClose, message } : { onClose: () => void, message?: string }) {
  return (
  <div className={`top-0 fixed flex items-center justify-center backdrop-blur z-20 w-full h-full p-5 lg:p-10`} onClick={() => onClose() }>
    <div className="p-5 lg:p-10 w-[300px] md:w-[500px] overflow-y-scroll bg-slate-50 border-2 border-slate-300 border-solid rounded-3xl shadow-md  drop-shadow-3xl" onClick={(e) => {e.stopPropagation()}}>
      <div className="dark:text-black">
        <div className="flex justify-center">
          <h1 className='text-xl mb-2'>Finalize the action in your wallet</h1>
        </div>

        <div className="flex w-full h-[100px] justify-center items-center">
          <div className="w-12 h-12 border-6 border-solid border-black border-r-transparent rounded-full animate-spin"></div>
        </div>
        {(message?.length! > 0) && 
          <div className="flex justify-center">
            <h2 className='text-lg mb-2'>{message}</h2>
          </div>
        }
      </div>
    </div>
  </div>
)}