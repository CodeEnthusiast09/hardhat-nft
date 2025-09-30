import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const RandomIpfsNftModule = buildModule("RandomIpfsNftModule", (m) => {
    const deployer = m.getAccount(0);

    const vrfCoordinatorV2Address = m.getParameter("vrfCoordinatorV2Address");
    const subscriptionId = m.getParameter("subscriptionId");
    const gasLane = m.getParameter("gasLane");
    const mintFee = m.getParameter("mintFee");
    const callbackGasLimit = m.getParameter("callbackGasLimit");
    const tokenUris = m.getParameter("tokenUris");

    const randomIpfsNftModule = m.contract(
        "RandomIpfsNft",
        [vrfCoordinatorV2Address, subscriptionId, gasLane, mintFee, callbackGasLimit, tokenUris],
        { from: deployer },
    );

    return { randomIpfsNftModule };
});

export default RandomIpfsNftModule;
