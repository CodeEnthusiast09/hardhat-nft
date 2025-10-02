import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DECIMALS = 8;
const INITIAL_PRICE = "200000000000"; // 2000

const MockV3AggregatorModule = buildModule("Mocks1Module", (m) => {
    const deployer = m.getAccount(0);

    const mockV3Aggregator = m.contract("MockV3Aggregator", [DECIMALS, INITIAL_PRICE], {
        from: deployer,
    });

    return { mockV3Aggregator };
});

export default MockV3AggregatorModule;
