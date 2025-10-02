import fs from "fs";
import path from "path";
import { network } from "hardhat";

/**
 * Reads the deployed address for a given contract/module
 * from Ignition's deployed_addresses.json
 *
 * @param key string - example: "BasicNftModule#BasicNft"
 * @returns deployed address as string
 */
export function getDeployedAddress(key: string): string {
    const chainId = network.config.chainId ?? 31337;

    const deploymentPath = path.join(
        __dirname,
        `../ignition/deployments/chain-${chainId}/deployed_addresses.json`,
    );

    if (!fs.existsSync(deploymentPath)) {
        throw new Error(
            `No deployed_addresses.json found at ${deploymentPath}.\n` + `Did you deploy?`,
        );
    }

    const deploymentJson = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

    const address = deploymentJson[key];
    if (!address) {
        throw new Error(`No address found for key "${key}" in deployed_addresses.json`);
    }

    return address;
}
