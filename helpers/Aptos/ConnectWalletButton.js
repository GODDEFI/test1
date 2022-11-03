import React, { useState } from "react";
import styles from '../../styles/Home.module.css'

import {useWallet} from "@manahippo/aptos-wallet-adapter"

import aptosLogo from "../../public/aptosLogo.png"
import ConnectWalletModal from "./ConnectWalletModal"

const ConnectWalletButton = (props) => {
    const {connectButton, className, style, disabled} = props

    const wallet = useWallet()
    const [showModal, setShowModal] = useState(false)

    function handleButtonClick() {
        if (connectButton) {
            setShowModal(true)
            return
        }
        wallet.disconnect()
    }

    const button = <button class="space-x-2 cursor-pointer bg-[#241D2D] text-white px-4 py-2 rounded-full" disabled={disabled}  onClick={handleButtonClick} style={style}>

        <span className="mb-0">{connectButton ? "Connect" : "Disconnect"}</span>
    </button>

    return (
        <>
        {connectButton ? button : wallet.account?.address?.toString() !== undefined ? <span className="">{button}</span> : null}
        <ConnectWalletModal show={showModal} onConnect={() => setShowModal(false)} />
        </>
    )
}

export default ConnectWalletButton;
