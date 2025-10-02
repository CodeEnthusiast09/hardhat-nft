import { run } from "hardhat";

async function main() {
    const contractAddress = "0xc8287d7861A1a4FF1103f3d9890F57803A5B959B";
    const vrfCoordinator = "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B";
    const subscriptionId = "4529";
    const gasLane = "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae";
    const callbackGasLimit = "500000";
    const mintFee = "10000000000000000";
    const dogTokenUris = [
        "ipfs://bafkreidwgbvd4cph5vjmyfjjkmgnom7nz7b6ues5cmtovclcks7dfsfiai",
        "ipfs://bafkreibdusqeb5o34gkadkroavftgjfekiuju77yaadaykacmh3q2xtx7u",
        "ipfs://bafkreib7vnqdrfs3pzz64w5vale65vkeubygpibpxh5ni7zeekb2kfg6xy",
    ];

    console.log("Verifying contract...");

    try {
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: [
                vrfCoordinator,
                subscriptionId,
                gasLane,
                mintFee,
                callbackGasLimit,
                dogTokenUris,
            ],
        });
        console.log("Contract verified successfully!");
    } catch (error: any) {
        if (error.message.toLowerCase().includes("already verified")) {
            console.log("Contract already verified!");
        } else {
            console.error(error);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
