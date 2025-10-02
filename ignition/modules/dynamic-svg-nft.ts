import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DynamicSvgNftModule = buildModule("DynamicSvgNftModule", (m) => {
    const deployer = m.getAccount(0);

    const priceFeed = m.getParameter("priceFeed");

    const lowSVG = m.getParameter("lowSVG");

    const highSVG = m.getParameter("highSVG");

    const dynamicSvgNft = m.contract("DynamicSvgNft", [priceFeed, lowSVG, highSVG], {
        from: deployer,
    });

    return { dynamicSvgNft };
});

export default DynamicSvgNftModule;
