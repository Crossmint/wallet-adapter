import {
    BaseMessageSignerWalletAdapter,
    WalletNotConnectedError,
    WalletNotReadyError,
    WalletPublicKeyError,
    WalletReadyState,
    WalletSignMessageError,
    WalletSignTransactionError,
} from '@solana/wallet-adapter-base';
import { PublicKey, Transaction } from '@solana/web3.js';
import store from 'store2';
import { CrossmintWalletName, CROSSMINT_LOGO_21x21 } from './crossmint-embed/consts/branding';
import { CROSSMINT_ACCOUNT_STORE } from './crossmint-embed/consts/storage';
import {
    CrossmintWalletAdapterParams,
    CrossmintWalletAdapterConfig,
    BlockchainTypes,
    CrossmintAccountStore,
} from './crossmint-embed/types/index';
import { buildConfig } from './crossmint-embed/utils/config';

import { CrossmintWindow } from './crossmint-embed/windowController/WindowController';

export class CrossmintWalletAdapter extends BaseMessageSignerWalletAdapter {
    name = CrossmintWalletName;
    url = 'https://crossmint.io';
    icon = CROSSMINT_LOGO_21x21;

    private _connecting: boolean;
    private _publicKey: PublicKey | null;
    private _readyState: WalletReadyState =
        typeof window === 'undefined' ? WalletReadyState.Unsupported : WalletReadyState.Loadable;

    private _config: CrossmintWalletAdapterConfig;

    constructor(params: CrossmintWalletAdapterParams) {
        super();

        this._connecting = false;
        this._publicKey = null;

        this._config = buildConfig(params);
    }

    get publicKey(): PublicKey | null {
        return this._publicKey;
    }

    get connecting(): boolean {
        return this._connecting;
    }

    get connected(): boolean {
        return this._publicKey !== null && this._publicKey !== undefined;
    }

    get readyState(): WalletReadyState {
        return this._readyState;
    }

    async connect(): Promise<void> {
        try {
            if (this.connected || this.connecting) return;
            if (this._readyState !== WalletReadyState.Loadable) throw new WalletNotReadyError();
            console.log('Attempting to connect...');

            this._connecting = true;

            let accounts = undefined;

            const sessionStoredAccount = (await store.session.get(CROSSMINT_ACCOUNT_STORE)) as
                | CrossmintAccountStore
                | undefined
                | null;

            if (sessionStoredAccount !== undefined && sessionStoredAccount !== null && sessionStoredAccount.publicKey) {
                accounts = [sessionStoredAccount.publicKey as string];
            }

            if (accounts === undefined) {
                const crossmint = new CrossmintWindow(this._config);
                await crossmint.init({
                    parentWindow: window,
                });

                accounts = await crossmint.login();
            }

            if (accounts !== undefined && accounts.length >= 1) {
                let publicKey: PublicKey;
                try {
                    publicKey = new PublicKey(accounts[0]);

                    if (sessionStoredAccount === undefined || sessionStoredAccount === null) {
                        await store.session.set(CROSSMINT_ACCOUNT_STORE, {
                            publicKey: publicKey.toString(),
                            chain: BlockchainTypes.SOLANA,
                        });
                    }

                    this._publicKey = publicKey;
                    this.emit('connect', publicKey);
                } catch (error: any) {
                    throw new WalletPublicKeyError(error?.message, error);
                }
            } else {
                throw new WalletNotConnectedError('Something went wrong...');
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        } finally {
            console.log('in finally');
            this._connecting = false;
        }
    }

    async disconnect(): Promise<void> {
        this._publicKey = null;
        store.session.clear();
        this.emit('disconnect');
    }

    async signTransaction(transaction: Transaction): Promise<Transaction> {
        throw new WalletSignTransactionError('Not implemented');
    }

    async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
        throw new WalletSignTransactionError('Not implemented');
    }

    async signMessage(message: Uint8Array): Promise<Uint8Array> {
        try {
            const crossmint = new CrossmintWindow(this._config);
            await crossmint.init({
                parentWindow: window,
            });

            try {
                const signedMessage = await crossmint.signMessage(message);

                if (signedMessage === undefined) {
                    throw new WalletSignMessageError('Something went wrong...');
                }

                return signedMessage;
            } catch (error: any) {
                throw new WalletSignMessageError(error?.message, error);
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }
}
