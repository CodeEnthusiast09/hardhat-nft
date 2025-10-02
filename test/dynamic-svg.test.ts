import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { assert, expect } from "chai";
import { network, ethers } from "hardhat";
import { DynamicSvgNft, MockV3Aggregator } from "../typechain-types";
import { networkConfig, developmentChains } from "../helper-hardhat.config";
import MockV3AggregatorModule from "../ignition/modules/mock-1";
import DynamicSvgNftModule from "../ignition/modules/dynamic-svg-nft";
import hre from "hardhat";
import fs from "fs";

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Dynamic SVG NFT Tests", function () {
          let dynamicSvgNft: DynamicSvgNft;

          let mockV3Aggregator: MockV3Aggregator;

          let deployer: SignerWithAddress;

          let user1: SignerWithAddress;

          let user2: SignerWithAddress;

          let priceFeedAddress: string;

          const lowSVG = fs.readFileSync("./images/dynamic-nft/frown.svg", { encoding: "utf8" });
          const highSVG = fs.readFileSync("./images/dynamic-nft/happy.svg", { encoding: "utf8" });

          const lowSVGImageuri =
              "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/Pgo8c3ZnIHdpZHRoPSIxMDI0cHgiIGhlaWdodD0iMTAyNHB4IiB2aWV3Qm94PSIwIDAgMTAyNCAxMDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxwYXRoIGZpbGw9IiMzMzMiIGQ9Ik01MTIgNjRDMjY0LjYgNjQgNjQgMjY0LjYgNjQgNTEyczIwMC42IDQ0OCA0NDggNDQ4IDQ0OC0yMDAuNiA0NDgtNDQ4Uzc1OS40IDY0IDUxMiA2NHptMCA4MjBjLTIwNS40IDAtMzcyLTE2Ni42LTM3Mi0zNzJzMTY2LjYtMzcyIDM3Mi0zNzIgMzcyIDE2Ni42IDM3MiAzNzItMTY2LjYgMzcyLTM3MiAzNzJ6Ii8+CiAgPHBhdGggZmlsbD0iI0U2RTZFNiIgZD0iTTUxMiAxNDBjLTIwNS40IDAtMzcyIDE2Ni42LTM3MiAzNzJzMTY2LjYgMzcyIDM3MiAzNzIgMzcyLTE2Ni42IDM3Mi0zNzItMTY2LjYtMzcyLTM3Mi0zNzJ6TTI4OCA0MjFhNDguMDEgNDguMDEgMCAwIDEgOTYgMCA0OC4wMSA0OC4wMSAwIDAgMS05NiAwem0zNzYgMjcyaC00OC4xYy00LjIgMC03LjgtMy4yLTguMS03LjRDNjA0IDYzNi4xIDU2Mi41IDU5NyA1MTIgNTk3cy05Mi4xIDM5LjEtOTUuOCA4OC42Yy0uMyA0LjItMy45IDcuNC04LjEgNy40SDM2MGE4IDggMCAwIDEtOC04LjRjNC40LTg0LjMgNzQuNS0xNTEuNiAxNjAtMTUxLjZzMTU1LjYgNjcuMyAxNjAgMTUxLjZhOCA4IDAgMCAxLTggOC40em0yNC0yMjRhNDguMDEgNDguMDEgMCAwIDEgMC05NiA0OC4wMSA0OC4wMSAwIDAgMSAwIDk2eiIvPgogIDxwYXRoIGZpbGw9IiMzMzMiIGQ9Ik0yODggNDIxYTQ4IDQ4IDAgMSAwIDk2IDAgNDggNDggMCAxIDAtOTYgMHptMjI0IDExMmMtODUuNSAwLTE1NS42IDY3LjMtMTYwIDE1MS42YTggOCAwIDAgMCA4IDguNGg0OC4xYzQuMiAwIDcuOC0zLjIgOC4xLTcuNCAzLjctNDkuNSA0NS4zLTg4LjYgOTUuOC04OC42czkyIDM5LjEgOTUuOCA4OC42Yy4zIDQuMiAzLjkgNy40IDguMSA3LjRINjY0YTggOCAwIDAgMCA4LTguNEM2NjcuNiA2MDAuMyA1OTcuNSA1MzMgNTEyIDUzM3ptMTI4LTExMmE0OCA0OCAwIDEgMCA5NiAwIDQ4IDQ4IDAgMSAwLTk2IDB6Ii8+Cjwvc3ZnPgo=";
          const highSVGimageUri =
              "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjAwIDIwMCIgd2lkdGg9IjQwMCIgIGhlaWdodD0iNDAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgZmlsbD0ieWVsbG93IiByPSI3OCIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIzIi8+CiAgPGcgY2xhc3M9ImV5ZXMiPgogICAgPGNpcmNsZSBjeD0iNjEiIGN5PSI4MiIgcj0iMTIiLz4KICAgIDxjaXJjbGUgY3g9IjEyNyIgY3k9IjgyIiByPSIxMiIvPgogIDwvZz4KICA8cGF0aCBkPSJtMTM2LjgxIDExNi41M2MuNjkgMjYuMTctNjQuMTEgNDItODEuNTItLjczIiBzdHlsZT0iZmlsbDpub25lOyBzdHJva2U6IGJsYWNrOyBzdHJva2Utd2lkdGg6IDM7Ii8+Cjwvc3ZnPg==";

          const highTokenUri =
              "data:application/json;base64,eyJuYW1lIjoiRHluYW1pYyBTVkcgTkZUIiwgImRlc2NyaXB0aW9uIjoiQW4gTkZUIHRoYXQgY2hhbmdlcyBiYXNlZCBvbiB0aGUgQ2hhaW5saW5rIEZlZWQiLCAiYXR0cmlidXRlcyI6IFt7InRyYWl0X3R5cGUiOiAiY29vbG5lc3MiLCAidmFsdWUiOiAxMDB9XSwgImltYWdlIjoiZGF0YTppbWFnZS9zdmcreG1sO2Jhc2U2NCxQSE4yWnlCMmFXVjNRbTk0UFNJd0lEQWdNakF3SURJd01DSWdkMmxrZEdnOUlqUXdNQ0lnSUdobGFXZG9kRDBpTkRBd0lpQjRiV3h1Y3owaWFIUjBjRG92TDNkM2R5NTNNeTV2Y21jdk1qQXdNQzl6ZG1jaVBnb2dJRHhqYVhKamJHVWdZM2c5SWpFd01DSWdZM2s5SWpFd01DSWdabWxzYkQwaWVXVnNiRzkzSWlCeVBTSTNPQ0lnYzNSeWIydGxQU0ppYkdGamF5SWdjM1J5YjJ0bExYZHBaSFJvUFNJeklpOCtDaUFnUEdjZ1kyeGhjM005SW1WNVpYTWlQZ29nSUNBZ1BHTnBjbU5zWlNCamVEMGlOakVpSUdONVBTSTRNaUlnY2owaU1USWlMejRLSUNBZ0lEeGphWEpqYkdVZ1kzZzlJakV5TnlJZ1kzazlJamd5SWlCeVBTSXhNaUl2UGdvZ0lEd3ZaejRLSUNBOGNHRjBhQ0JrUFNKdE1UTTJMamd4SURFeE5pNDFNMk11TmprZ01qWXVNVGN0TmpRdU1URWdOREl0T0RFdU5USXRMamN6SWlCemRIbHNaVDBpWm1sc2JEcHViMjVsT3lCemRISnZhMlU2SUdKc1lXTnJPeUJ6ZEhKdmEyVXRkMmxrZEdnNklETTdJaTgrQ2p3dmMzWm5QZz09In0=";
          const lowTokenUri =
              "data:application/json;base64,eyJuYW1lIjoiRHluYW1pYyBTVkcgTkZUIiwgImRlc2NyaXB0aW9uIjoiQW4gTkZUIHRoYXQgY2hhbmdlcyBiYXNlZCBvbiB0aGUgQ2hhaW5saW5rIEZlZWQiLCAiYXR0cmlidXRlcyI6IFt7InRyYWl0X3R5cGUiOiAiY29vbG5lc3MiLCAidmFsdWUiOiAxMDB9XSwgImltYWdlIjoiZGF0YTppbWFnZS9zdmcreG1sO2Jhc2U2NCxQRDk0Yld3Z2RtVnljMmx2YmowaU1TNHdJaUJ6ZEdGdVpHRnNiMjVsUFNKdWJ5SS9QZ284YzNabklIZHBaSFJvUFNJeE1ESTBjSGdpSUdobGFXZG9kRDBpTVRBeU5IQjRJaUIyYVdWM1FtOTRQU0l3SURBZ01UQXlOQ0F4TURJMElpQjRiV3h1Y3owaWFIUjBjRG92TDNkM2R5NTNNeTV2Y21jdk1qQXdNQzl6ZG1jaVBnb2dJRHh3WVhSb0lHWnBiR3c5SWlNek16TWlJR1E5SWswMU1USWdOalJETWpZMExqWWdOalFnTmpRZ01qWTBMallnTmpRZ05URXljekl3TUM0MklEUTBPQ0EwTkRnZ05EUTRJRFEwT0MweU1EQXVOaUEwTkRndE5EUTRVemMxT1M0MElEWTBJRFV4TWlBMk5IcHRNQ0E0TWpCakxUSXdOUzQwSURBdE16Y3lMVEUyTmk0MkxUTTNNaTB6TnpKek1UWTJMall0TXpjeUlETTNNaTB6TnpJZ016Y3lJREUyTmk0MklETTNNaUF6TnpJdE1UWTJMallnTXpjeUxUTTNNaUF6TnpKNklpOCtDaUFnUEhCaGRHZ2dabWxzYkQwaUkwVTJSVFpGTmlJZ1pEMGlUVFV4TWlBeE5EQmpMVEl3TlM0MElEQXRNemN5SURFMk5pNDJMVE0zTWlBek56SnpNVFkyTGpZZ016Y3lJRE0zTWlBek56SWdNemN5TFRFMk5pNDJJRE0zTWkwek56SXRNVFkyTGpZdE16Y3lMVE0zTWkwek56SjZUVEk0T0NBME1qRmhORGd1TURFZ05EZ3VNREVnTUNBd0lERWdPVFlnTUNBME9DNHdNU0EwT0M0d01TQXdJREFnTVMwNU5pQXdlbTB6TnpZZ01qY3lhQzAwT0M0eFl5MDBMaklnTUMwM0xqZ3RNeTR5TFRndU1TMDNMalJETmpBMElEWXpOaTR4SURVMk1pNDFJRFU1TnlBMU1USWdOVGszY3kwNU1pNHhJRE01TGpFdE9UVXVPQ0E0T0M0Mll5MHVNeUEwTGpJdE15NDVJRGN1TkMwNExqRWdOeTQwU0RNMk1HRTRJRGdnTUNBd0lERXRPQzA0TGpSak5DNDBMVGcwTGpNZ056UXVOUzB4TlRFdU5pQXhOakF0TVRVeExqWnpNVFUxTGpZZ05qY3VNeUF4TmpBZ01UVXhMalpoT0NBNElEQWdNQ0F4TFRnZ09DNDBlbTB5TkMweU1qUmhORGd1TURFZ05EZ3VNREVnTUNBd0lERWdNQzA1TmlBME9DNHdNU0EwT0M0d01TQXdJREFnTVNBd0lEazJlaUl2UGdvZ0lEeHdZWFJvSUdacGJHdzlJaU16TXpNaUlHUTlJazB5T0RnZ05ESXhZVFE0SURRNElEQWdNU0F3SURrMklEQWdORGdnTkRnZ01DQXhJREF0T1RZZ01IcHRNakkwSURFeE1tTXRPRFV1TlNBd0xURTFOUzQySURZM0xqTXRNVFl3SURFMU1TNDJZVGdnT0NBd0lEQWdNQ0E0SURndU5HZzBPQzR4WXpRdU1pQXdJRGN1T0MwekxqSWdPQzR4TFRjdU5DQXpMamN0TkRrdU5TQTBOUzR6TFRnNExqWWdPVFV1T0MwNE9DNDJjemt5SURNNUxqRWdPVFV1T0NBNE9DNDJZeTR6SURRdU1pQXpMamtnTnk0MElEZ3VNU0EzTGpSSU5qWTBZVGdnT0NBd0lEQWdNQ0E0TFRndU5FTTJOamN1TmlBMk1EQXVNeUExT1RjdU5TQTFNek1nTlRFeUlEVXpNM3B0TVRJNExURXhNbUUwT0NBME9DQXdJREVnTUNBNU5pQXdJRFE0SURRNElEQWdNU0F3TFRrMklEQjZJaTgrQ2p3dmMzWm5QZ289In0=";

          beforeEach(async () => {
              const accounts: SignerWithAddress[] = await ethers.getSigners();

              deployer = accounts[0];

              user1 = accounts[1];

              user2 = accounts[2];

              const mockDeployment = await hre.ignition.deploy(MockV3AggregatorModule);

              mockV3Aggregator = mockDeployment.mockV3Aggregator as unknown as MockV3Aggregator;

              priceFeedAddress = await mockV3Aggregator.getAddress();

              const dynamicSvgNftDeployment = await hre.ignition.deploy(DynamicSvgNftModule, {
                  parameters: {
                      DynamicSvgNftModule: {
                          // mockPriceFeed: await mockV3Aggregator.getAddress(),
                          // livePriceFeed: await mockV3Aggregator.getAddress(),
                          priceFeed: await mockV3Aggregator.getAddress(),
                          lowSVG: lowSVG,
                          highSVG: highSVG,
                      },
                  },
              });

              dynamicSvgNft = dynamicSvgNftDeployment.dynamicSvgNft as unknown as DynamicSvgNft;
          });

          describe("constructor", function () {
              it("sets starting values correctly", async function () {
                  const lowSvg = await dynamicSvgNft.getLowSVG();

                  const highSvg = await dynamicSvgNft.getHighSVG();

                  const priceFeed = await dynamicSvgNft.getPriceFeed();

                  assert.equal(lowSvg, lowSVGImageuri);

                  assert.equal(highSvg, highSVGimageUri);

                  assert.equal(priceFeed, priceFeedAddress);
              });

              it("initializes the NFT name and symbol correctly", async function () {
                  const name = await dynamicSvgNft.name();

                  const symbol = await dynamicSvgNft.symbol();

                  assert.equal(name, "Dynamic SVG NFT");

                  assert.equal(symbol, "DSN");
              });

              it("initializes token counter to zero", async function () {
                  const tokenCounter = await dynamicSvgNft.getTokenCounter();

                  assert.equal(tokenCounter.toString(), "0");
              });

              describe("mintNft", function () {
                  it("emits an event and creates the NFT", async function () {
                      const highValue = ethers.parseEther("1");

                      await expect(dynamicSvgNft.mintNft(highValue)).to.emit(
                          dynamicSvgNft,
                          "CreatedNFT",
                      );
                  });

                  it("increments the token counter", async function () {
                      const highValue = ethers.parseEther("1");

                      const mintTx = await dynamicSvgNft.mintNft(highValue);

                      await mintTx.wait(1);

                      const counter = await dynamicSvgNft.getTokenCounter();

                      assert.equal(counter.toString(), "1");
                  });

                  it("stores the highValue for the token ID", async function () {
                      const highValue = ethers.parseEther("1"); // 1e18

                      const mintTx = await dynamicSvgNft.mintNft(highValue);
                      await mintTx.wait(1);

                      // Initially, price is low, so should return low SVG
                      let tokenUri = await dynamicSvgNft.tokenURI(0);
                      assert.equal(tokenUri, lowTokenUri);

                      // Update price to be >= highValue
                      await mockV3Aggregator.updateAnswer(ethers.parseEther("2")); // 2e18 > 1e18

                      // Now should return high SVG, proving highValue was stored correctly
                      tokenUri = await dynamicSvgNft.tokenURI(0);
                      assert.equal(tokenUri, highTokenUri);
                  });

                  it("mints NFT to the caller", async function () {
                      const highValue = ethers.parseEther("1");

                      const mintTx = await dynamicSvgNft.connect(user1).mintNft(highValue);

                      await mintTx.wait(1);

                      const owner0 = await dynamicSvgNft.ownerOf(0);

                      assert.equal(owner0, user1.address);
                  });

                  it("allows multiple users to mint NFTs", async function () {
                      const highValue = ethers.parseEther("1");

                      await expect(dynamicSvgNft.connect(user1).mintNft(highValue)).to.emit(
                          dynamicSvgNft,
                          "CreatedNFT",
                      );

                      await expect(dynamicSvgNft.connect(user2).mintNft(highValue)).to.emit(
                          dynamicSvgNft,
                          "CreatedNFT",
                      );

                      await expect(dynamicSvgNft.connect(deployer).mintNft(highValue)).to.emit(
                          dynamicSvgNft,
                          "CreatedNFT",
                      );
                  });

                  it("assigns sequential token IDs", async function () {
                      const highValue = ethers.parseEther("1");

                      await dynamicSvgNft.connect(user1).mintNft(highValue);

                      await dynamicSvgNft.connect(user2).mintNft(highValue);

                      await dynamicSvgNft.connect(deployer).mintNft(highValue);

                      const owner0 = await dynamicSvgNft.ownerOf(0);

                      const owner1 = await dynamicSvgNft.ownerOf(1);

                      const owner2 = await dynamicSvgNft.ownerOf(2);

                      assert.equal(owner0, user1.address);

                      assert.equal(owner1, user2.address);

                      assert.equal(owner2, deployer.address);
                  });
              });

              describe("tokenURI", function () {
                  it("returns low image URI when price is below high value", async function () {
                      const highValue = ethers.parseEther("5");

                      const { answer } = await mockV3Aggregator.latestRoundData();
                      assert.isTrue(answer < highValue);

                      const mintTx = await dynamicSvgNft.mintNft(highValue);
                      await mintTx.wait(1);

                      let tokenUri = await dynamicSvgNft.tokenURI(0);
                      assert.equal(tokenUri, lowTokenUri);
                  });

                  it("returns high image URI when price meets or exceeds high value", async function () {
                      const highValue = ethers.parseEther("5");

                      await mockV3Aggregator.updateAnswer(ethers.parseEther("10"));

                      const { answer } = await mockV3Aggregator.latestRoundData();

                      const mintTx = await dynamicSvgNft.mintNft(highValue);
                      await mintTx.wait(1);

                      let tokenUri = await dynamicSvgNft.tokenURI(0);
                      assert.equal(tokenUri, highTokenUri);
                  });

                  it("shifts the token uri to lower when the price doesn't surpass the highvalue", async function () {
                      const highValue = ethers.parseEther("1");

                      const mintTx = await dynamicSvgNft.mintNft(highValue);
                      await mintTx.wait(1);

                      let tokenUri = await dynamicSvgNft.tokenURI(0);
                      assert.equal(tokenUri, lowTokenUri);

                      await mockV3Aggregator.updateAnswer(ethers.parseEther("2"));

                      tokenUri = await dynamicSvgNft.tokenURI(0);
                      assert.equal(tokenUri, highTokenUri);
                  });

                  it("returns properly formatted base64 JSON metadata", async function () {
                      const highValue = ethers.parseEther("1");

                      const mintTx = await dynamicSvgNft.mintNft(highValue);
                      await mintTx.wait(1);

                      const tokenUri = await dynamicSvgNft.tokenURI(0);

                      assert.isTrue(tokenUri.startsWith("data:application/json;base64,"));

                      const base64String = tokenUri.split(",")[1];
                      const decoded = Buffer.from(base64String, "base64").toString("utf8");

                      const metadata = JSON.parse(decoded);

                      assert.isDefined(metadata.name);
                      assert.isDefined(metadata.description);
                      assert.isDefined(metadata.attributes);
                      assert.isDefined(metadata.image);
                  });

                  it("includes correct name and description in metadata", async function () {
                      const highValue = ethers.parseEther("1");
                      const mintTx = await dynamicSvgNft.mintNft(highValue);
                      await mintTx.wait(1);

                      const tokenUri = await dynamicSvgNft.tokenURI(0);

                      const base64String = tokenUri.split(",")[1];
                      const decoded = Buffer.from(base64String, "base64").toString("utf8");
                      const metadata = JSON.parse(decoded);

                      assert.equal(metadata.name, "Dynamic SVG NFT");
                      assert.equal(
                          metadata.description,
                          "An NFT that changes based on the Chainlink Feed",
                      );

                      assert.isArray(metadata.attributes);
                      assert.equal(metadata.attributes.length, 1);
                      assert.equal(metadata.attributes[0].trait_type, "coolness");
                      assert.equal(metadata.attributes[0].value, 100);

                      assert.isTrue(metadata.image.startsWith("data:image/svg+xml;base64,"));
                  });

                  it("reverts for non-existent token", async function () {
                      await expect(dynamicSvgNft.tokenURI(0))
                          .to.be.revertedWithCustomError(dynamicSvgNft, "ERC721NonexistentToken")
                          .withArgs(0);

                      const highValue = ethers.parseEther("1");
                      await dynamicSvgNft.mintNft(highValue);

                      await dynamicSvgNft.tokenURI(0);

                      await expect(dynamicSvgNft.tokenURI(1))
                          .to.be.revertedWithCustomError(dynamicSvgNft, "ERC721NonexistentToken")
                          .withArgs(1);
                  });
              });
          });
      });
