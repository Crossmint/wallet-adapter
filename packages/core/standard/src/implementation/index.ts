import { SolanaWindow } from '../interfaces';
import { SolanaWallets } from './solana';

declare const window: SolanaWindow;

if (!window.solana) window.solana = { wallets: new SolanaWallets() };
else if (!window.solana.wallets) window.solana.wallets = new SolanaWallets();
