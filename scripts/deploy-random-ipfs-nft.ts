import hre from "hardhat";
import { network } from "hardhat";
import MocksModule from "../ignition/modules/mock";
import RandomIpfsNftModule from "../ignition/modules/random-ipfs-nft";
import {
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
} from "../helper-hardhat.config";
import verify from "../utils/verify";
import { Log } from "ethers";
import { storeImages, storeTokenUriMetadata } from "../utils/upload-to-pinata";

const FUND_AMOUNT = "1000000000000000000000";

const imagesLocation = "./images/random-nft/";

let tokenUris = [
    "ipfs://bafkreidwgbvd4cph5vjmyfjjkmgnom7nz7b6ues5cmtovclcks7dfsfiai",
    "ipfs://bafkreibdusqeb5o34gkadkroavftgjfekiuju77yaadaykacmh3q2xtx7u",
    "ipfs://bafkreib7vnqdrfs3pzz64w5vale65vkeubygpibpxh5ni7zeekb2kfg6xy",
];

const metadataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: [
        {
            trait_type: "Cuteness",
            value: 100,
        },
    ],
};

async function main() {
    let vrfCoordinatorV2_5Address: string | undefined, subscriptionId: string | bigint | undefined;

    if (process.env.UPLOAD_TO_PINATA == "true") {
        tokenUris = await handleTokenUris();
    }

    if (developmentChains.includes(hre.network.name)) {
        console.log("Local network detected, deploying mocks...");

        const mockResult = await hre.ignition.deploy(MocksModule);

        const mock = mockResult.vrfCoordinatorV2_5Mock;

        vrfCoordinatorV2_5Address = await mock.getAddress();

        const transactionResponse = await mock.createSubscription();

        const receipt = await transactionResponse.wait();

        const event = receipt.logs
            .map((log: Log) => {
                try {
                    return mock.interface.parseLog(log);
                } catch {
                    return null;
                }
            })
            .find((parsed: ReturnType<typeof mock.interface.parseLog> | null) => {
                return parsed && parsed.name === "SubscriptionCreated";
            });

        if (!event) {
            throw new Error("SubscriptionCreated event not found");
        }

        subscriptionId = event.args.subId;

        await mock.fundSubscription(subscriptionId, FUND_AMOUNT);
    } else {
        vrfCoordinatorV2_5Address = networkConfig[network.config.chainId!]["vrfCoordinatorV2_5"];

        subscriptionId = networkConfig[network.config.chainId!]["subscriptionId"];
    }

    console.log("Deploying randomIpfsNft...");

    const cfg = networkConfig[network.config.chainId!];

    if (!cfg?.gasLane || !cfg?.mintFee || !cfg?.callbackGasLimit) {
        throw new Error("Missing required network config values");
    }

    const otherArgs = [cfg.gasLane, cfg.mintFee, cfg.callbackGasLimit];

    const randomNftDeployment = await hre.ignition.deploy(RandomIpfsNftModule, {
        parameters: {
            RandomIpfsNftModule: {
                vrfCoordinatorV2_5Address: vrfCoordinatorV2_5Address!,
                subscriptionId: subscriptionId!,
                gasLane: cfg.gasLane,
                mintFee: cfg.mintFee,
                callbackGasLimit: cfg.callbackGasLimit,
                tokenUris: tokenUris,
            },
        },
    });

    const randomIpfsNft = randomNftDeployment.randomIpfsNftModule;

    const randomIpfsNftAddress = await randomIpfsNft.getAddress();

    console.log(`Contract was deployed to: ${randomIpfsNftAddress}`);

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
        await verify(randomIpfsNftAddress, [
            vrfCoordinatorV2_5Address,
            subscriptionId,
            ...otherArgs,
        ]);
    }
}

async function handleTokenUris() {
    // Check out https://github.com/PatrickAlphaC/nft-mix for a pythonic version of uploading
    // to the raw IPFS-daemon from https://docs.ipfs.io/how-to/command-line-quick-start/
    // You could also look at pinata https://www.pinata.cloud/
    tokenUris = [];

    const { responses: imageUploadResponses, files } = await storeImages(imagesLocation);

    for (const imageUploadResponseIndex in imageUploadResponses) {
        let tokenUriMetadata = { ...metadataTemplate };

        tokenUriMetadata.name = files[imageUploadResponseIndex].replace(".png", "");

        tokenUriMetadata.description = `An adorable ${tokenUriMetadata.name} pup!`;

        tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].cid}`;

        console.log(`Uploading ${tokenUriMetadata.name}...`);

        const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata);

        tokenUris.push(`ipfs://${metadataUploadResponse!.cid}`);
    }

    console.log("Token URIs uploaded! They are:");
    console.log(tokenUris);

    return tokenUris;
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
