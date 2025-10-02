import {
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
    networkConfig,
} from "../helper-hardhat.config";
import verify from "../utils/verify";
import hre from "hardhat";
import fs from "fs";
import DynamicSvgNftModule from "../ignition/modules/dynamic-svg-nft";
import MockV3AggregatorModule from "../ignition/modules/mock-1";

async function main() {
    let priceFeedAddress: string;

    if (developmentChains.includes(hre.network.name)) {
        console.log("Local network detected, deploying mocks...");
        const mockResult = await hre.ignition.deploy(MockV3AggregatorModule);
        const mock = mockResult.mockV3Aggregator;
        priceFeedAddress = await mock.getAddress();
    } else {
        const chainId = hre.network.config.chainId!;

        const feed = networkConfig[chainId]?.ethUsdPriceFeed;

        if (!feed) throw new Error(`Missing feed for ${hre.network.name}`);
        priceFeedAddress = feed;
    }

    const lowSVG = fs.readFileSync("./images/dynamic-nft/frown.svg", { encoding: "utf8" });
    const highSVG = fs.readFileSync("./images/dynamic-nft/happy.svg", { encoding: "utf8" });

    console.log("Deploying DynamicSvgNft...");

    const dynamicSvgNftDeployment = await hre.ignition.deploy(DynamicSvgNftModule, {
        parameters: {
            DynamicSvgNftModule: {
                // mockPriceFeed: priceFeedAddress,
                // livePriceFeed: priceFeedAddress,
                priceFeed: priceFeedAddress,
                lowSVG: lowSVG,
                highSVG: highSVG,
            },
        },
    });

    const dynamicSvgNft = dynamicSvgNftDeployment.dynamicSvgNft;

    const dynamicSvgNftAddress = await dynamicSvgNft.getAddress();

    console.log(`Contract was deployed to: ${dynamicSvgNftAddress}`);

    // With Ignition, the contract is already deployed and confirmed
    // We can get the deployment transaction from the current block
    const deploymentBlock = await hre.ethers.provider.getBlockNumber();
    console.log(`Deployed at block: ${deploymentBlock}`);

    // Wait additional confirmations if needed for verification
    if (!developmentChains.includes(hre.network.name) && VERIFICATION_BLOCK_CONFIRMATIONS > 1) {
        console.log(`Waiting for ${VERIFICATION_BLOCK_CONFIRMATIONS} block confirmations...`);

        // Wait for the specified number of blocks
        let currentBlock = deploymentBlock;
        while (currentBlock < deploymentBlock + VERIFICATION_BLOCK_CONFIRMATIONS) {
            await new Promise((resolve) => setTimeout(resolve, 12000)); // Wait ~12 seconds per block
            currentBlock = await hre.ethers.provider.getBlockNumber();
        }

        console.log(`Confirmed at block: ${currentBlock}`);
    }

    if (!developmentChains.includes(hre.network.name) && process.env.ETHERSCAN_API_KEY) {
        await verify(dynamicSvgNftAddress, [priceFeedAddress, lowSVG, highSVG]);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
