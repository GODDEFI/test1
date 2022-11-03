import gsap from "gsap";
import Head from 'next/head'
import React, { useEffect, useState } from 'react';
import styles from '../styles/Home.module.css'

import { AptosClient } from "aptos";
import { useWallet } from '@manahippo/aptos-wallet-adapter';
import cmHelper from "../helpers/candyMachineHelper"
import ConnectWalletButton from '../helpers/Aptos/ConnectWalletButton';
import {candyMachineAddress, collectionName, collectionCoverUrl, NODE_URL, CONTRACT_ADDRESS, COLLECTION_SIZE} from "../helpers/candyMachineInfo"

import Navbar from './navbar';
import Spinner from "react-bootstrap/Spinner"
import Modal from "react-bootstrap/Modal"

import { toast } from 'react-toastify';

const aptosClient = new AptosClient(NODE_URL);
const autoCmRefresh = 10000;

export default function HeroPage() {
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

  React.useEffect(() => {
    const config = {
        src: 'https://cdn.discordapp.com/attachments/889226929457234002/1035518221215871067/afsdfffeeehhh.png',
        rows: 15,
        cols: 7
        }
        
        // UTILS
        
        const randomRange = (min, max) => min + Math.random() * (max - min)
        
        const randomIndex = (array) => randomRange(0, array.length) | 0
        
        const removeFromArray = (array, i) => array.splice(i, 1)[0]
        
        const removeItemFromArray = (array, item) => removeFromArray(array, array.indexOf(item))
        
        const removeRandomFromArray = (array) => removeFromArray(array, randomIndex(array))
        
        const getRandomFromArray = (array) => (
        array[randomIndex(array) | 0]
        )
        
        // TWEEN FACTORIES
        
        const resetPeep = ({ stage, peep }) => {
        const direction = Math.random() > 0.5 ? 1 : -1
        // using an ease function to skew random to lower values to help hide that peeps have no legs
        const offsetY = 100 - 250 * gsap.parseEase('power2.in')(Math.random())
        const startY = stage.height - peep.height + offsetY
        let startX
        let endX
        
        if (direction === 1) {
        startX = -peep.width
        endX = stage.width
        peep.scaleX = 1
        } else {
        startX = stage.width + peep.width
        endX = 0
        peep.scaleX = -1
        }
        
        peep.x = startX
        peep.y = startY
        peep.anchorY = startY
        
        return {
        startX,
        startY,
        endX
        }
        }
        
        const normalWalk = ({ peep, props }) => {
        const {
        startX,
        startY,
        endX
        } = props
        
        const xDuration = 10
        const yDuration = 0.25
        
        const tl = gsap.timeline()
        tl.timeScale(randomRange(0.5, 1.5))
        tl.to(peep, {
        duration: xDuration,
        x: endX,
        ease: 'none'
        }, 0)
        tl.to(peep, {
        duration: yDuration,
        repeat: xDuration / yDuration,
        yoyo: true,
        y: startY - 10
        }, 0)
        
        return tl
        }
        
        const walks = [
        normalWalk,
        ]
        
        // CLASSES
        
        class Peep {
        constructor({
        image,
        rect,
        }) {
        this.image = image
        this.setRect(rect)
        
        this.x = 0
        this.y = 0
        this.anchorY = 0
        this.scaleX = 1
        this.walk = null
        }
        
        setRect (rect) {
        this.rect = rect
        this.width = rect[2]
        this.height = rect[3]
        
        this.drawArgs = [
          this.image,
          ...rect,
          0, 0, this.width, this.height
        ]  
        }
        
        render (ctx) {
        ctx.save()
        ctx.translate(this.x, this.y)
        ctx.scale(this.scaleX, 1)
        ctx.drawImage(...this.drawArgs)
        ctx.restore()
        }
        }
        
        // MAIN
        
        const img = document.createElement('img')
        img.onload = init
        img.src = config.src
        
        const canvas = document.querySelector('#canvas')
        const ctx = canvas.getContext('2d')
        
        const stage = {
        width: 0,
        height: 0,
        }
        
        const allPeeps = []
        const availablePeeps = []
        const crowd = []
        
        function init () {  
        createPeeps()
        
        // resize also (re)populates the stage
        resize()
        
        gsap.ticker.add(render)
        window.addEventListener('resize', resize)
        }
        
        function createPeeps () {
        const {
        rows,
        cols
        } = config
        const {
        naturalWidth: width,
        naturalHeight: height
        } = img
        const total = rows * cols
        const rectWidth = width / rows
        const rectHeight = height / cols
        
        for (let i = 0; i < total; i++) {
        allPeeps.push(new Peep({
          image: img,
          rect: [
            (i % rows) * rectWidth,
            (i / rows | 0) * rectHeight,
            rectWidth,
            rectHeight,
          ]
        }))
        }  
        }
        
        function resize () {
        stage.width = canvas.clientWidth
        stage.height = canvas.clientHeight
        canvas.width = stage.width * devicePixelRatio
        canvas.height = stage.height * devicePixelRatio
        
        crowd.forEach((peep) => {
        peep.walk.kill()
        })
        
        crowd.length = 0
        availablePeeps.length = 0
        availablePeeps.push(...allPeeps)
        
        initCrowd()
        }
        
        function initCrowd () {
        while (availablePeeps.length) {
        // setting random tween progress spreads the peeps out
        addPeepToCrowd().walk.progress(Math.random())
        }
        }
        
        function addPeepToCrowd () {
        const peep = removeRandomFromArray(availablePeeps)
        const walk = getRandomFromArray(walks)({
        peep,
        props: resetPeep({
          peep,
          stage,
        })
        }).eventCallback('onComplete', () => {
        removePeepFromCrowd(peep)
        addPeepToCrowd()
        })
        
        peep.walk = walk
        
        crowd.push(peep)
        crowd.sort((a, b) => a.anchorY - b.anchorY)
        
        return peep
        }
        
        function removePeepFromCrowd (peep) {
        removeItemFromArray(crowd, peep)
        availablePeeps.push(peep)
        }
        
        function render () {
        canvas.width = canvas.width
        ctx.save()
        ctx.scale(devicePixelRatio, devicePixelRatio)
        
        crowd.forEach((peep) => {
        peep.render(ctx)
        })
        
        ctx.restore()
        }
  }, []);

  return (
    



    <div class="hero-core">

    <canvas class="walk"  id="canvas" ></canvas>
    <div class="center-box">
        <div class="row height100">
          <div class="col-6 left-hero">
          <div class="hero-logo"><img src="https://cdn.discordapp.com/attachments/889226929457234002/1035564682016215190/unknown.png" alt="logo" class="object-contain w-full h-full" /></div>
          </div>
          <div class="col-6">

              <div className="d-flex align-items-center my-3">
                <input className={`${styles.defaultInput} me-3`} type="number" min="1" max={candyMachineData.data.maxMintsPerWallet === undefined ? 10 : Math.min(candyMachineData.data.maxMintsPerWallet, candyMachineData.data.numUploadedTokens - candyMachineData.data.numMintedTokens)} value={mintInfo.numToMint} onChange={(e) => setMintInfo({...mintInfo, numToMint: e.target.value})} />
                <button className={styles.button} onClick={mint} disabled={!canMint}>{mintInfo.minting ? <Spinner animation="border" role="status"><span className="visually-hidden">Loading...</span></Spinner> : "Mint"}</button>
                <h4 className="mx-3 mb-0">{candyMachineData.data.mintFee * mintInfo.numToMint} $APT</h4>
                <span style={{width: "15px", height: "15px", borderRadius: "50%", background: candyMachineData.data.isPublic ? "green" : "red"}}></span>
              </div>
              <h5>{candyMachineData.data.numMintedTokens}/ {COLLECTION_SIZE} minted</h5>



        </div>
        </div>
    
    </div>
    </div>


  );
}