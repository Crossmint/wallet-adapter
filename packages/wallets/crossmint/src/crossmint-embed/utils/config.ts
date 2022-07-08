import { LIB_VERSION } from '../consts/version';
import { CrossmintEnvironment, CrossmintWalletAdapterConfig, CrossmintWalletAdapterParams } from '../types/index';

export function buildConfig(params: CrossmintWalletAdapterParams): CrossmintWalletAdapterConfig {
    const ret: CrossmintWalletAdapterConfig = {
        libVersion: LIB_VERSION,
        apiKey: params.apiKey,
        environment: params.environment || CrossmintEnvironment.PROD,
        appMetadata: params.appMetadata,
    };

    return ret;
}
