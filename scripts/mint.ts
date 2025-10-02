import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";
import { Log } from "ethers";
import { developmentChains } from "../helper-hardhat.config";

async function main() {
    const chainId = network.config.chainId ?? 31337;

    // Path to deployed addresses
    const deploymentPath = path.join(
        __dirname,
        `../ignition/deployments/chain-${chainId}/deployed_addresses.json`,
    );

    const deploymentJson = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

    // --- Basic NFT ---
    const basicNftAddress = deploymentJson["BasicNftModule#BasicNft"];

    const basicNft = await ethers.getContractAt("BasicNft", basicNftAddress);

    const basicMintTx = await basicNft.mintNft();

    await basicMintTx.wait(1);
    console.log(`Basic NFT index 0 tokenURI: ${await basicNft.tokenURI(0)}`);

    // --- Dynamic SVG NFT ---
    const dynamicSvgNftAddress = deploymentJson["DynamicSvgNftModule#DynamicSvgNft"];

    const dynamicSvgNft = await ethers.getContractAt("DynamicSvgNft", dynamicSvgNftAddress);

    const highValue = ethers.parseEther("4000");

    const dynamicSvgMintTx = await dynamicSvgNft.mintNft(highValue);

    await dynamicSvgMintTx.wait(1);
    console.log(`Dynamic SVG NFT index 0 tokenURI: ${await dynamicSvgNft.tokenURI(0)}`);

    // --- Random IPFS NFT ---
    const randomIpfsNftAddress = deploymentJson["RandomIpfsNftModule#RandomIpfsNft"];
    const randomIpfsNft = await ethers.getContractAt("RandomIpfsNft", randomIpfsNftAddress);

    const mintFee = await randomIpfsNft.getMintFee();

    // Only do mock consumer + fulfill flow on local chains
    if (developmentChains.includes(network.name)) {
        const vrfMockAddress = deploymentJson["MocksModule#VRFCoordinatorV2_5Mock"];
        const vrfCoordinatorV2_5Mock = await ethers.getContractAt(
            "VRFCoordinatorV2_5Mock",
            vrfMockAddress,
        );

        const subId = await randomIpfsNft.getSubscriptionId();
        await vrfCoordinatorV2_5Mock.addConsumer(subId, randomIpfsNftAddress);

        const tx = await randomIpfsNft.requestNft({ value: mintFee.toString() });
        const receipt = await tx.wait(1);

        const reqId = receipt!.logs
            .map((log: Log) => {
                try {
                    return vrfCoordinatorV2_5Mock.interface.parseLog(log);
                } catch {
                    return null;
                }
            })
            .find((parsed) => parsed && parsed.name === "RandomWordsRequested")?.args.requestId;

        if (!reqId) throw new Error("No RandomWordsRequested found");

        // Simulate Chainlink VRF response
        await vrfCoordinatorV2_5Mock.fulfillRandomWords(reqId, randomIpfsNftAddress);

        console.log(`Random IPFS NFT minted locally! tokenURI: ${await randomIpfsNft.tokenURI(0)}`);
    } else {
        // On Sepolia, just request NFT - a real Chainlink VRF node must fulfill it
        const tx = await randomIpfsNft.requestNft({ value: mintFee.toString() });
        await tx.wait(1);

        console.log(
            `Random IPFS NFT request sent on ${network.name}. Wait for Chainlink VRF to fulfill.`,
        );
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
