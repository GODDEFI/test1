import Head from 'next/head'
import React, { useEffect, useState } from 'react';
import styles from '../styles/Home.module.css'

import { AptosClient } from "aptos";
import { useWallet } from '@manahippo/aptos-wallet-adapter';
import cmHelper from "../helpers/candyMachineHelper"
import ConnectWalletButton from '../helpers/Aptos/ConnectWalletButton';
import {candyMachineAddress, collectionName, collectionCoverUrl, NODE_URL, CONTRACT_ADDRESS, COLLECTION_SIZE} from "../helpers/candyMachineInfo"

import Navbar from './navbar';
import HeroPage from './test';
import Spinner from "react-bootstrap/Spinner"
import Modal from "react-bootstrap/Modal"

import { toast } from 'react-toastify';

const aptosClient = new AptosClient(NODE_URL);
const autoCmRefresh = 10000;

export default function Home() {
  const wallet = useWallet();
  const [isFetchignCmData, setIsFetchignCmData] = useState(false)
  const [candyMachineData, setCandyMachineData] = useState({data: {}, fetch: fetchCandyMachineData})
  const [timeLeftToMint, setTimeLeftToMint] = useState({presale: "", public: "", timeout: null})

  const [mintInfo, setMintInfo] = useState({numToMint: 1, minting: false, success: false, mintedNfts: []})

  const [canMint, setCanMint] = useState(false)

  useEffect(() => {
    if (!wallet.autoConnect && wallet.wallet?.adapter) {
        wallet.connect();
    }
  }, [wallet.autoConnect, wallet.wallet, wallet.connect]);

  const mint = async () => {
    if (wallet.account?.address?.toString() === undefined || mintInfo.minting) return;

    console.log(wallet.account?.address?.toString());
    setMintInfo({...mintInfo, minting: true})
    // Generate a transaction
    const payload = {
      type: "entry_function_payload",
      function: `${CONTRACT_ADDRESS}::candy_machine_v2::mint_tokens`,
      type_arguments: [],
      arguments: [
      	candyMachineAddress,
	      collectionName,
	      mintInfo.numToMint,
      ]
    };

    let txInfo;
    try {
      const txHash = await wallet.signAndSubmitTransaction(payload);
      console.log(txHash);
      txInfo = await aptosClient.waitForTransactionWithResult(txHash.hash)
    } catch (err) {
      txInfo = {
        success: false,
        vm_status: err.message,
      }
    }
    handleMintTxResult(txInfo)
    if (txInfo.success) setCandyMachineData({...candyMachineData, data: {...candyMachineData.data, numMintedTokens: (parseInt(candyMachineData.data.numMintedTokens) + parseInt(mintInfo.numToMint)).toString()}})
  }

  async function handleMintTxResult(txInfo) {
    console.log(txInfo);
    const mintSuccess = txInfo.success;
    console.log(mintSuccess ? "Mint success!" : `Mint failure, an error occured.`)

    let mintedNfts = []
    if (!mintSuccess) {
        /// Handled error messages
        const handledErrorMessages = new Map([
            ["Failed to sign transaction", "An error occured while signing."],
            ["Move abort in 0x1::coin: EINSUFFICIENT_BALANCE(0x10006): Not enough coins to complete transaction", "Insufficient funds to mint."],
        ]);

        const txStatusError = txInfo.vm_status;
        console.error(`Mint not successful: ${txStatusError}`);
        let errorMessage = handledErrorMessages.get(txStatusError);
        errorMessage = errorMessage === undefined ? "Unkown error occured. Try again." : errorMessage;

        toast.error(errorMessage);
    } else {
        mintedNfts = await cmHelper.getMintedNfts(aptosClient, candyMachineData.data.tokenDataHandle, candyMachineData.data.cmResourceAccount, collectionName, txInfo)
        toast.success("Minting success!")
    }

    
    setMintInfo({...mintInfo, minting: false, success: mintSuccess, mintedNfts})
}



  async function fetchCandyMachineData(indicateIsFetching = false) {
    console.log("Fetching candy machine data...")
    if (indicateIsFetching) setIsFetchignCmData(true)
    const cmResourceAccount = await cmHelper.getCandyMachineResourceAccount();
    if (cmResourceAccount === null) {
      setCandyMachineData({...candyMachineData, data: {}})
      setIsFetchignCmData(false)
      return
    }

    const collectionInfo = await cmHelper.getCandyMachineCollectionInfo(cmResourceAccount);
    const configData = await cmHelper.getCandyMachineConfigData(collectionInfo.candyMachineConfigHandle);
    setCandyMachineData({...candyMachineData, data: {cmResourceAccount, ...collectionInfo, ...configData}})
    setIsFetchignCmData(false)
  }

  function verifyTimeLeftToMint() {
    const mintTimersTimeout = setTimeout(verifyTimeLeftToMint, 1000)
    if (candyMachineData.data.presaleMintTime === undefined || candyMachineData.data.publicMintTime === undefined) return

    const currentTime = Math.round(new Date().getTime() / 1000);
    setTimeLeftToMint({timeout : mintTimersTimeout, presale: cmHelper.getTimeDifference(currentTime, candyMachineData.data.presaleMintTime), public: cmHelper.getTimeDifference(currentTime, candyMachineData.data.publicMintTime)})
  }

  useEffect(() => {
    fetchCandyMachineData(true)
    setInterval(fetchCandyMachineData, autoCmRefresh)
    
  }, [])

  useEffect(() => {
    clearTimeout(timeLeftToMint.timeout)
    verifyTimeLeftToMint()
    console.log(candyMachineData.data)
  }, [candyMachineData])

  // useEffect(() => {
  //   setCanMint(wallet.connected && candyMachineData.data.isPublic && parseInt(candyMachineData.data.numUploadedTokens) > parseInt(candyMachineData.data.numMintedTokens) && timeLeftToMint.presale === "LIVE")
  // }, [wallet, candyMachineData, timeLeftToMint])
  useEffect(() => {
    setCanMint(true)
  }, [wallet, candyMachineData, timeLeftToMint])

  return (
    
    <nav class="flex justify-between z-30 text-[#241D2D] font-normal">
    <div class="cursor-pointer flex justify-start">
        <svg width="171" height="45" fill="none" xmlns="http://www.w3.org/2000/svg" class="scale-75 md:scale-100">
            <path
                d="M30.695 32.461c-1.158-.418-2.317-.875-3.103-1.87-.833-1.054-1.164-2.48-.767-3.777.395-1.294 1.384-1.9 2.639-2.116 1.334-.23 2.624-.017 3.896.34l-.002-5.78.003-1.62c-9.02.349-15.796 6.266-15.796 6.266s-.027 13.424-.027 20.234L33.36 35.4v-2.162a21.975 21.975 0 0 1-2.665-.777v.001ZM15.796 23.905S9.02 17.987 0 17.638l.003 1.62c0 .718 0 3.156-.002 5.963 1.14-.415 2.311-.689 3.555-.593 1.268.096 2.31.609 2.824 1.86.516 1.254.32 2.705-.41 3.832-.691 1.064-1.802 1.627-2.916 2.152a22.07 22.07 0 0 1-2.997 1.154L0 33.645v1.658l15.822 8.836c0-6.81-.026-20.234-.026-20.234Z"
                fill="#49D8CD"
            ></path>
            <path
                d="M33.228 16.099c-6.306.364-11.704 2.77-16.556 6.6C11.8 18.858 6.402 16.458.13 16.1c.503-1.396 1.239-2.065 2.777-1.79 4.635.83 8.904 2.526 12.772 5.197.69.478 1.14.603 1.903.068 3.77-2.643 7.943-4.335 12.48-5.193 1.546-.292 2.58.01 3.167 1.715Z"
                fill="#49D8CD"
            ></path>
            <path d="M11.845 14.701a1.613 1.613 0 1 1 0-3.225 1.613 1.613 0 0 1 0 3.225Zm9.367 0a1.613 1.613 0 1 1 0-3.225 1.613 1.613 0 0 1 0 3.225Z" fill="#49D8CD"></path>
            <path d="M21.212 11.477a1.613 1.613 0 1 0 0 3.225 1.613 1.613 0 0 0 0-3.225ZM11.845 11.477a1.613 1.613 0 1 0 0 3.225 1.613 1.613 0 0 0 0-3.225Z" fill="#49D8CD"></path>
            <path
                d="M2.918 12.466c1.338.24 2.647.55 3.924.935a4.96 4.96 0 0 1 .494-2.493c1.29-2.653 4.49-3.7 7.056-2.24 1.486.846 2.864.82 4.354-.011 1.781-.994 3.61-.904 5.298.264 1.62 1.122 2.374 2.706 2.188 4.608a34.627 34.627 0 0 1 4.341-1.063c.262-.046.5-.066.718-.06-.514-1.208-1.582-2.131-2.987-2.48-.248-.06-.543-.278-.65-.503a7.267 7.267 0 0 0-2.921-3.205c-1.018-.604-2.016-1.244-3.051-1.817-1.324-.732-2.65-1.18-3.98-1.343-.216-.083-.451-.18-.72-.3A6.056 6.056 0 0 1 14.709.95a.22.22 0 0 0-.357.005c-.209.299-.55 1.048-.76 1.644a.22.22 0 0 1-.323.115c-.219-.136-.545-.577-.86-.84a.22.22 0 0 0-.338.071c-.186.375-.501 1.054-.513 2.384l-.094.05c-1.078.59-2.119 1.251-3.174 1.886-1.253.753-2.172 1.803-2.827 3.11-.123.244-.425.49-.689.557-1.4.356-2.5 1.301-3.002 2.527.325-.072.702-.072 1.147.008Z"
                fill="#49D8CD"
            ></path>
            <path
                d="M55.644 12.183h-4.241l-7.379 20.465h4.532l1.513-4.48h6.913l1.513 4.48h4.532l-7.383-20.465Zm-2.123 5.169 1.292 4.448.881 2.7h-4.347l.882-2.7 1.292-4.448ZM72.86 26.677h-3.377v5.967h-4.158V12.15h7.535c4.864 0 7.296 2.372 7.296 7.116 0 2.39-.623 4.231-1.869 5.514-1.227 1.264-3.036 1.9-5.427 1.9v-.004Zm-3.377-3.557h3.345c2.072 0 3.106-1.288 3.106-3.858 0-1.264-.25-2.169-.752-2.713-.503-.563-1.288-.845-2.35-.845h-3.345v7.42l-.004-.004ZM83.072 32.648V12.151h13.262v3.618H87.23v4.794h7.295v3.558H87.23v4.914h9.104v3.618H83.072v-.005ZM100.725 12.156h8.047c2.132 0 3.729.433 4.795 1.296 1.065.845 1.596 2.22 1.596 4.13 0 1.145-.171 2.058-.512 2.741-.342.665-.923 1.255-1.749 1.777.904.383 1.569.932 1.989 1.656.443.725.664 1.726.664 3.014 0 1.988-.581 3.465-1.749 4.43-1.167.964-2.8 1.448-4.914 1.448h-8.167V12.156Zm7.955 11.937h-3.798v5.002h3.798c.904 0 1.569-.18 1.989-.544.443-.36.664-1.025.664-1.989 0-1.647-.886-2.473-2.653-2.473v.004Zm-.12-8.38h-3.678v4.883h3.706c1.568 0 2.348-.813 2.348-2.442 0-1.628-.793-2.44-2.381-2.44h.005ZM122.994 27.642c.581 1.01 1.661 1.513 3.23 1.513s2.639-.503 3.202-1.514c.582-1.028.873-2.736.873-5.121 0-2.386-.291-4.154-.873-5.242-.581-1.09-1.652-1.63-3.202-1.63s-2.621.545-3.202 1.63c-.582 1.084-.873 2.833-.873 5.242 0 2.408.282 4.097.845 5.122Zm9.579 2.56c-1.222 1.63-3.336 2.446-6.344 2.446-3.009 0-5.136-.817-6.378-2.446-1.222-1.652-1.831-4.222-1.831-7.715 0-3.493.609-6.086 1.831-7.775 1.242-1.707 3.369-2.561 6.378-2.561 3.008 0 5.122.854 6.344 2.56 1.242 1.69 1.865 4.278 1.865 7.776s-.623 6.064-1.865 7.716ZM141.876 27.642c.581 1.01 1.661 1.513 3.23 1.513s2.639-.503 3.202-1.514c.582-1.028.872-2.736.872-5.121 0-2.386-.29-4.154-.872-5.242-.581-1.09-1.647-1.63-3.202-1.63s-2.621.545-3.203 1.63c-.581 1.088-.872 2.833-.872 5.242 0 2.408.282 4.097.845 5.122Zm9.579 2.56c-1.223 1.63-3.336 2.446-6.345 2.446-3.008 0-5.135-.817-6.377-2.446-1.223-1.652-1.832-4.222-1.832-7.715 0-3.493.609-6.086 1.832-7.775 1.242-1.707 3.369-2.561 6.377-2.561 3.009 0 5.122.854 6.345 2.56 1.242 1.69 1.864 4.278 1.864 7.776s-.622 6.064-1.864 7.716Z"
                fill="#191B3B"
            ></path>
            <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M159.906 12.155v8.062c1.933-.356 3.35-1.588 4.379-3.161 1.273-1.943 1.744-4.107 1.744-4.9h3.973c0 1.642-.743 4.554-2.395 7.078-.724 1.107-1.666 2.196-2.838 3.073 1.172.881 2.114 1.966 2.838 3.073 1.652 2.524 2.395 5.436 2.395 7.079h-3.973c0-.794-.471-2.958-1.744-4.9-1.029-1.574-2.441-2.806-4.379-3.162v8.256h-4.126V12.155h4.126Z"
                fill="#191B3B"
            ></path>
        </svg>
    </div>
    <div class="md:hidden">
        <button class=" css-18pd5zv" tabindex="0" type="button" aria-haspopup="true">
            <svg class="css-vubbuv" focusable="false" aria-hidden="true" viewBox="0 0 24 24" data-testid="MenuIcon"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"></path></svg>
            <span class=" css-w0pj6f"></span>
        </button>
    </div>
    <div class="hidden md:flex space-x-8 items-center text-sm cursor-pointer">
        <a href="https://twitter.com/apebook_nft" target="_blank" rel="noreferrer">
            <div class="space-x-2 select-none">
                <svg aria-hidden="true" focusable="false" data-prefix="fab" data-icon="twitter" class="svg-inline--fa fa-twitter" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                    <path
                        fill="currentColor"
                        d="M459.37 151.716c.325 4.548.325 9.097.325 13.645 0 138.72-105.583 298.558-298.558 298.558-59.452 0-114.68-17.219-161.137-47.106 8.447.974 16.568 1.299 25.34 1.299 49.055 0 94.213-16.568 130.274-44.832-46.132-.975-84.792-31.188-98.112-72.772 6.498.974 12.995 1.624 19.818 1.624 9.421 0 18.843-1.3 27.614-3.573-48.081-9.747-84.143-51.98-84.143-102.985v-1.299c13.969 7.797 30.214 12.67 47.431 13.319-28.264-18.843-46.781-51.005-46.781-87.391 0-19.492 5.197-37.36 14.294-52.954 51.655 63.675 129.3 105.258 216.365 109.807-1.624-7.797-2.599-15.918-2.599-24.04 0-57.828 46.782-104.934 104.934-104.934 30.213 0 57.502 12.67 76.67 33.137 23.715-4.548 46.456-13.32 66.599-25.34-7.798 24.366-24.366 44.833-46.132 57.827 21.117-2.273 41.584-8.122 60.426-16.243-14.292 20.791-32.161 39.308-52.628 54.253z"
                    ></path>
                </svg>
                <span>TWITTER</span>
            </div>
        </a>
        <div class="space-x-2 select-none"><span>EXPLORE</span></div>
        <div class="space-x-2 select-none"><span>UPCOMING</span></div>
        

        <ConnectWalletButton connectButton={!wallet.connected} className="d-flex" />
            

    </div>
</nav>


  );
}

