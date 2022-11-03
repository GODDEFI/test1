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
    <div className="bg-gray-500">
    <div class="page-setup">

<div class="main-container">
<Navbar></Navbar>
    <div class="container-b-gap">
        <div class="hero-b-gap">
            <div class="hero-t-gap">
                <div class="text-gap1">
                    <h2 class="header-text1">Quirkies Originals</h2>
                    <p class="header-text2">5,000 Quirkies brought into the metaverse to celebrate everyone&#x27;s quirks&#x27;</p>
                </div>
                <div>
        <HeroPage></HeroPage>
    </div>
            </div>
            <div class="color-bg">
                <div class="stat-core-setup">
                    <div class="logo-box"><img src="https://cdn.discordapp.com/attachments/889226929457234002/1035564682016215190/unknown.png" alt="logo" class="object-contain w-full h-full" /></div>
                    <div class="page-strug">
                        <div class="grid grid-cols-3 gap-2 mdpx-20">
                            <div class="text-stat-container">
                                <h4 class="text-stat-header">53.9K</h4>
                                <p class="text-stat">Twitter Followers</p>
                            </div>
                            <div class="text-stat-container">
                                <h4 class="text-stat-header">{candyMachineData.data.numMintedTokens}/ {COLLECTION_SIZE} </h4>
                                <p class="text-stat">Minted</p>
                            </div>
                            <div class="text-stat-container">
                                <h4 class="text-stat-header">1.7K</h4>
                                <p class="text-stat">Discord Active Member</p>
                            </div>
                        </div>
                        <div class="border-contaier">
                            <div class="grid grid-cols-3">
                                <div class="detail-header">
                                    <p class="detail-text">Collection Size</p>
                                    <h6 class="detail-text-bold">6,666</h6>
                                </div>
                                <div class="right-con">
                                    <div class="right-border"></div>
                                    <div class="text-stat-container">
                                        <p class="detail-text">Mint Price</p>
                                        <h6 class="detail-text-bold">{candyMachineData.data.mintFee * mintInfo.numToMint} $APT</h6>
                                    </div>
                                    <div class="right-border"></div>
                                </div>
                                <div class="text-stat-container">
                                    <p class="detail-text">Mint Date</p>
                                    <h6 class="detail-text-bold">TBA</h6>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="hero-b-gap">
            <div class="color-bg">
                <div class="hero-t-gap">
                    <div class="topic-header">About the Project</div>
                    <p class=" topic-detail">
                        Quirkies are a collection of 5,000 unique characters minted on the Ethereum Blockchain. Quirkies are your personal companion and will become your metaverse persona, so make sure you get a hold of a
                        Quirkie which you feel represents you. Quirkies are created by our team artist through several hundred traits of quirkiness.
                    </p>
                </div>
            </div>
            <div class="grid grid-cols-12 gap-6 text-stat-container">
                <div class="col-span-12 col-span-4 auto-cols-min hero-t-gap">
                    <div class="color-bg">
                        <div class="hero-t-gap">
                            <div class="topic-header">Recent Important Timeline</div>
                            <div class="timeline">
                                <div class="itembox">
                                    <div class="itembox-border">
                                        <div class="item-image">
                                            <img src="../../storage.googleapis.com/apebook_storage/project/quirkiesoriginals/timeline_1.jpg" alt="item" class="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                    <div class="detail-header">
                                        <h6 class=" timeline-bold">Jan 21, 2022</h6>
                                        <p class=" css-yrlsfa">Quirksville discord</p>
                                    </div>
                                </div>
                                <div class="line"></div>
                                <div class="itembox">
                                    <div class="itembox-border">
                                        <div class="item-image">
                                            <img src="../../storage.googleapis.com/apebook_storage/project/quirkiesoriginals/timeline_2.png" alt="item" class="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                    <div class="detail-header">
                                        <h6 class=" timeline-bold">Feb 10, 2022</h6>
                                        <p class=" css-yrlsfa">Quirkies Mint</p>
                                    </div>
                                </div>
                                <div class="line"></div>
                                <div class="itembox">
                                    <div class="itembox-border">
                                        <div class="item-image">
                                            <img src="../../storage.googleapis.com/apebook_storage/project/quirkiesoriginals/timeline_3.jpg" alt="item" class="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                    <div class="detail-header">
                                        <h6 class=" timeline-bold">May 05, 2022</h6>
                                        <p class=" css-yrlsfa">The Quirk Shop</p>
                                    </div>
                                </div>
                                <div class="line"></div>
                                <div class="itembox">
                                    <div class="itembox-border">
                                        <div class="item-image">
                                            <img src="../../storage.googleapis.com/apebook_storage/project/quirkiesoriginals/timeline_4.jpg" alt="item" class="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                    <div class="detail-header">
                                        <h6 class=" timeline-bold">Jun 03, 2022</h6>
                                        <p class=" css-yrlsfa">Quirkling Released</p>
                                    </div>
                                </div>
                                <div class="line"></div>
                                <div class="itembox">
                                    <div class="itembox-border">
                                        <div class="item-image">
                                            <img src="../../storage.googleapis.com/apebook_storage/project/quirkiesoriginals/timeline_5.png" alt="item" class="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                    <div class="detail-header">
                                        <h6 class=" timeline-bold">Jul 03, 2022</h6>
                                        <p class=" css-yrlsfa">Launched Marketplace</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
                <div class="col-span-12 col-span-8 auto-cols-min container-b-gap">
                    <div class="color-bg">
                        <div class="hero-t-gap">
                            <div class="topic-header">Project RoadMap</div>
                            <div class="text-stat-container">
                                <div class="step-text">
                                    <p class=" step-text-detail">Quirkstep 1 - Launch MInt and build out the Quirky Community from those who have supported us from the beginning.</p>
                                </div>
                                <div class="step-text">
                                    <p class=" step-text-detail">Quirkstep 2 - Quirkies exclusive access to limited run merchandise with several runs of new styles.</p>
                                </div>
                                <div class="step-text">
                                    <p class=" step-text-detail">
                                        Quirkstep 3 - Bringing Quirksville into the metaverse and building Quirksville in the broader metaverse including creating a space for community to share and promote their creative
                                        side.
                                    </p>
                                </div>
                                <div class="step-text"><p class=" step-text-detail">Quirkstep 4 - Quirkies release companions to keep from being lonely (Quirklings).</p></div>
                                <div class="step-text">
                                    <p class=" step-text-detail">Quirkstep 5 - Giving Quirkies membership access to events, and exclusive experiences.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="color-bg">
                        <div class="hero-t-gap">
                            <div class="topic-header">Key Events</div>
                            <div class="hero-t-gap">
                                <div class="text-stat-container">
                                    <h5 class=" event-text">Quirksville discord</h5>
                                    <p class=" topic-detail">Launch of the Quirksville discord.</p>
                                </div>
                                <div class="text-stat-container">
                                    <h5 class=" event-text">Quirkies Mint</h5>
                                    <p class=" topic-detail">On February 10, 2022, Quirkies collection of 5,000 NFT minted onto the Ethereum blockchain.</p>
                                </div>
                                <div class="text-stat-container">
                                    <h5 class=" event-text">The Quirk Shop</h5>
                                    <p class=" topic-detail">On May 5, 2022, The Quirk shop is released allowing Quirkies holders to presale quirkies clothing and accessory.</p>
                                </div>
                                <div class="text-stat-container">
                                    <h5 class=" event-text">Quirkling Released</h5>
                                    <p class=" topic-detail">
                                        On June 3, 2022, Quirkies released Quirkling, a companion collection of 10,000 NFTs. Each Quirkie is entitled to claim 1 Quirkling. The remaining 5000 Quirklings will be minted via WL
                                        + Public sale.
                                    </p>
                                </div>

                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>

    </div>
</div>
<div class="main-layout"></div>
</div>
      <div className={styles.container}>
        <Head>
          <title>Aptos Y00ts Yacth Club</title>
          <meta name="description" content="Aptos NFT Mint" />
          <link rel="icon" href="https://cdn.discordapp.com/attachments/889226929457234002/1035564682016215190/unknown.png" />
        </Head>



          <img src={collectionCoverUrl} style={{ width: "480px", height:"480px" }} />
          <div id="collection-info" className="d-flex flex-column align-items-center text-white" style={{width: "80%"}}>
            {isFetchignCmData ? <Spinner animation="border" role="status" className="mt-5"><span className="visually-hidden">Loading...</span></Spinner> : 
            <>
              <div className="d-flex align-items-center my-3">
                <input className={`${styles.defaultInput} me-3`} type="number" min="1" max={candyMachineData.data.maxMintsPerWallet === undefined ? 10 : Math.min(candyMachineData.data.maxMintsPerWallet, candyMachineData.data.numUploadedTokens - candyMachineData.data.numMintedTokens)} value={mintInfo.numToMint} onChange={(e) => setMintInfo({...mintInfo, numToMint: e.target.value})} />
                <button className={styles.button} onClick={mint} disabled={!canMint}>{mintInfo.minting ? <Spinner animation="border" role="status"><span className="visually-hidden">Loading...</span></Spinner> : "Mint"}</button>
                <h4 className="mx-3 mb-0">{candyMachineData.data.mintFee * mintInfo.numToMint} $APT</h4>
                <span style={{width: "15px", height: "15px", borderRadius: "50%", background: candyMachineData.data.isPublic ? "green" : "red"}}></span>
              </div>
              <h5>{candyMachineData.data.numMintedTokens}/ {COLLECTION_SIZE} minted</h5>

            </>}
          </div>

          <Modal id="mint-results-modal" show={mintInfo.success} onHide={() => setMintInfo({...mintInfo, success: false, mintedNfts: []})} centered size="lg">
            <Modal.Body className="cover">
                <div className="d-flex justify-content-center w-100 my-5" style={{flexWrap: "wrap"}}>
                    {mintInfo.mintedNfts.map(mintedNft => <div key={mintedNft.name} className={`${styles.mintedNftCard} d-flex flex-column mx-3`}>
                        <img src={mintedNft.imageUri === null ? "" : mintedNft.imageUri} />
                        <h5 className="text-white text-center mt-2">{mintedNft.name}</h5>

                    </div>)}
                </div>
            </Modal.Body>
        </Modal>



      </div>
    </div>
  )
}
