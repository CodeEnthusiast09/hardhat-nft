// Import the NFTStorage class and File constructor from the 'nft.storage' package
import { NFTStorage, File } from "nft.storage";
import mime from "mime";
import fs from "fs";
import path from "path";
import "dotenv/config";

const NFT_STORAGE_KEY = process.env.NFT_STORAGE_KEY;

/**
 * Reads image files from a directory and stores them as NFTs with generated metadata.
 * @param imagesPath - The path to the directory containing images
 * @returns Array of NFT storage responses
 */
export async function storeNFTs(imagesPath: string) {
    const fullImagesPath = path.resolve(imagesPath);

    const files = fs.readdirSync(fullImagesPath);

    let responses = [];

    console.log("Uploading to NFT.Storage...");

    for (const fileIndex in files) {
        console.log(`Uploading ${files[fileIndex]}...`);

        const image = await fileFromPath(`${fullImagesPath}/${files[fileIndex]}`);

        const nftstorage = new NFTStorage({ token: NFT_STORAGE_KEY! });

        const dogName = files[fileIndex].replace(".png", "");

        const response = await nftstorage.store({
            image,
            name: dogName,
            description: `An adorable ${dogName}`,
            // Currently doesn't support attributes 😔
            // attributes: [{ trait_type: "cuteness", value: 100 }],
        });

        responses.push(response);

        console.log(`Uploaded ${dogName}`);
        console.log(`URL: ${response.url}`);
        console.log(`Token: ${response.ipnft}`);
    }

    return responses;
}

/**
 * A helper to read a file from a location on disk and return a File object.
 * Note that this reads the entire file into memory and should not be used for
 * very large files.
 * @param filePath - The path to a file to store
 * @returns A File object containing the file content
 */
export async function fileFromPath(filePath: string): Promise<File> {
    const content = await fs.promises.readFile(filePath);

    const type = mime.getType(filePath);

    const uint8Array = new Uint8Array(content);

    return new File([uint8Array], path.basename(filePath), {
        type: type || "application/octet-stream",
    });
}
