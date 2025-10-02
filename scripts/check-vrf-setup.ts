import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    const chainId = network.config.chainId ?? 31337;

    // Path to deployed addresses
    const deploymentPath = path.join(
        __dirname,
        `../ignition/deployments/chain-${chainId}/deployed_addresses.json`,
    );

    const deploymentJson = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

    // Get RandomIpfsNft contract
    const randomIpfsNftAddress = deploymentJson["RandomIpfsNftModule#RandomIpfsNft"];
    const randomIpfsNft = await ethers.getContractAt("RandomIpfsNft", randomIpfsNftAddress);

    const vrfCoordinatorV2_5Address = deploymentJson["MocksModule#VRFCoordinatorV2_5Mock"];

    console.log("\n=== VRF Setup Diagnostics ===");
    console.log(`Network: ${network.name}`);
    console.log(`RandomIpfsNft Address: ${randomIpfsNftAddress}`);

    // Get contract details
    const subId = await randomIpfsNft.getSubscriptionId();
    const mintFee = await randomIpfsNft.getMintFee();

    console.log(`\nContract Configuration:`);
    console.log(`Subscription ID: ${subId}`);
    console.log(`Mint Fee: ${ethers.formatEther(mintFee)} ETH`);
    console.log(`VRF Coordinator: ${vrfCoordinatorV2_5Address}`);

    // Check VRF subscription details
    const vrfCoordinatorV2 = await ethers.getContractAt(
        "VRFCoordinatorV2_5Mock",
        vrfCoordinatorV2_5Address,
    );

    try {
        const subscription = await vrfCoordinatorV2.getSubscription(subId);
        console.log(`\nSubscription Details:`);
        console.log(`Balance: ${ethers.formatEther(subscription.balance)} LINK`);
        console.log(`Owner: ${subscription.owner}`);
        console.log(`Consumers: ${subscription.consumers.length}`);
        console.log(`Consumer addresses:`, subscription.consumers);

        // Check if our contract is a consumer
        const isConsumer = subscription.consumers.some(
            (addr: string) => addr.toLowerCase() === randomIpfsNftAddress.toLowerCase(),
        );
        console.log(`\n✓ Is RandomIpfsNft registered as consumer? ${isConsumer ? "YES" : "NO"}`);

        if (!isConsumer) {
            console.log("\n⚠️  ERROR: Contract is NOT registered as a consumer!");
            console.log("You need to add it as a consumer on Chainlink VRF subscription.");
            console.log(`\nTo fix this, go to: https://vrf.chain.link/`);
            console.log(`1. Select Sepolia network`);
            console.log(`2. Find subscription ID: ${subId}`);
            console.log(`3. Add consumer: ${randomIpfsNftAddress}`);
        }

        // Check LINK balance
        const balanceInLink = Number(ethers.formatEther(subscription.balance));
        if (balanceInLink < 2) {
            console.log("\n⚠️  WARNING: Low LINK balance!");
            console.log(`Current balance: ${balanceInLink} LINK`);
            console.log("You should fund your subscription with at least 2-5 LINK tokens.");
        }
    } catch (error: any) {
        console.error("\n❌ Error checking subscription:", error.message);
        console.log("\nThis might mean:");
        console.log("1. The subscription ID doesn't exist");
        console.log("2. You don't have access to view it");
        console.log(`\nCheck your subscription at: https://vrf.chain.link/`);
    }

    // Check signer balance
    const [signer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(signer.address);
    console.log(`\nSigner Details:`);
    console.log(`Address: ${signer.address}`);
    console.log(`ETH Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < mintFee) {
        console.log("\n⚠️  ERROR: Insufficient ETH balance to pay mint fee!");
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
