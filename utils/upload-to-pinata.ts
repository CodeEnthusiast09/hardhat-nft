import { PinataSDK } from "pinata";
import fs from "fs";
import path from "path";
import { config as dotenvConfig } from "dotenv";

dotenvConfig({ path: ".env", quiet: true });

const pinata = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT!,
});

// Type definition for Pinata response
interface PinataResponse {
    id: string;
    group_id: string | null;
    name: string;
    cid: string;
    created_at: string;
    size: number;
    number_of_files: number;
    mime_type: string;
    vectorized: boolean;
    network: string;
}

export async function storeImages(imagesFilePath: string) {
    const fullImagesPath = path.resolve(imagesFilePath);
    const files = fs.readdirSync(fullImagesPath);
    let responses: PinataResponse[] = [];

    console.log("Uploading images to IPFS with Pinata...");

    for (const fileIndex in files) {
        const filePath = `${fullImagesPath}/${files[fileIndex]}`;
        console.log(`Uploading ${files[fileIndex]}...`);

        try {
            // Create a File object from the file contents
            const fileBuffer = fs.readFileSync(filePath);
            const file = new File(
                [fileBuffer],
                files[fileIndex],
                { type: "image/png" }, // Adjust based on your image type (png, jpg, etc.)
            );

            const response = await pinata.upload.public.file(file);
            responses.push(response);
            console.log(`Uploaded ${files[fileIndex]}`);
            console.log(`CID: ${response.cid}`);
            console.log(`Size: ${response.size} bytes`);
        } catch (error) {
            console.log(`Error uploading ${files[fileIndex]}:`, error);
        }
    }

    return { responses, files };
}

export async function storeTokenUriMetadata(metadata: Object) {
    console.log("Uploading metadata to IPFS with Pinata...");

    try {
        const response = await pinata.upload.public.json(metadata);
        console.log(`Metadata uploaded`);
        console.log(`CID: ${response.cid}`);
        console.log(`Size: ${response.size} bytes`);
        return response;
    } catch (error) {
        console.log("Error uploading metadata:", error);
    }

    return null;
}
