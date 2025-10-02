export interface networkConfigItem {
    name?: string;
    subscriptionId?: string;
    callbackGasLimit?: string;
    vrfCoordinatorV2_5?: string;
    gasLane?: string;
    ethUsdPriceFeed?: string;
    mintFee?: string;
}

export interface networkConfigInfo {
    [key: number]: networkConfigItem;
}

export const networkConfig: networkConfigInfo = {
    31337: {
        name: "localhost",
        ethUsdPriceFeed: "0x9326BFA02ADD2366b30bacB125260Af641031331",
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", // 30 gwei
        mintFee: "10000000000000000", // 0.01 ETH
        callbackGasLimit: "500000", // 500,000 gas
    },
    // Price Feed Address, values can be obtained at https://docs.chain.link/data-feeds/price-feeds/addresses
    // Default one is ETH/USD contract on Sepolia
    11155111: {
        name: "sepolia",
        ethUsdPriceFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
        vrfCoordinatorV2_5: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
        gasLane: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
        callbackGasLimit: "2500000", // 500,000 gas
        mintFee: "10000000000000000", // 0.01 ETH
        subscriptionId:
            "57458313366285643664447462583623105256718767822971408006239186772063943734529", // add your ID here!
    },
};

export const DECIMALS = "18";
export const INITIAL_PRICE = "200000000000000000000";
export const developmentChains = ["hardhat", "localhost"];
export const VERIFICATION_BLOCK_CONFIRMATIONS = 6;
