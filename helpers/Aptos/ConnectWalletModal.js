import styles from '../../styles/Home.module.css'

import {useWallet} from "@manahippo/aptos-wallet-adapter"
import aptosLogo from "../../public/aptosLogo.png"

import Modal from "react-bootstrap/Modal"

const ConnectWalletModal = (props) => {
    const {show, onConnect} = props

    const wallet = useWallet()

    return (
        <Modal show={show} onHide={onConnect} centered>
            
            <Modal.Body className="modal-all-wallet d-flex flex-column">
                <div class="text-stat-header" style={{fontSize : "30px"}}>Choose your wallet</div>
                {wallet.wallets.map((walletType) => {
                    const adapter = walletType.adapter;
                    return <button key={adapter.name} className={styles.walletAdapterOption} onClick={async () => {
                        await wallet.select(adapter.name);
                        onConnect();
                      }}>
                        
                        <img src={adapter.icon} />
                        <h6 className="mb-0">{adapter.name}</h6>
                    </button>
                })}
            </Modal.Body>
        </Modal>
    )
}

export default ConnectWalletModal;
