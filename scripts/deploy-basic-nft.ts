import hre from "hardhat";
import { developmentChains, VERIFICATION_BLOCK_CONFIRMATIONS } from "../helper-hardhat.config";
import verify from "../utils/verify";
import BasicNftModule from "../ignition/modules/basic-nft";

async function main() {
    const basicNftDeployed = await hre.ignition.deploy(BasicNftModule);

    const basicNft = basicNftDeployed.basicNft;

    const basicNftAddress = await basicNft.getAddress();

    console.log(`Contract was deployed to: ${basicNftAddress}`);

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
        await verify(basicNftAddress, []);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
