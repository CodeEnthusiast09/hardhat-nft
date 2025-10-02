import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { assert, expect } from "chai";
import { network, ethers } from "hardhat";
import { RandomIpfsNft, VRFCoordinatorV2_5Mock } from "../typechain-types";
import { networkConfig, developmentChains } from "../helper-hardhat.config";
import MockModule from "../ignition/modules/mock";
import RandomIpfsNftModule from "../ignition/modules/random-ipfs-nft";
import hre from "hardhat";
import { Log } from "ethers";

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Random IPFS NFT Tests", function () {
          let randomIpfsNft: RandomIpfsNft;

          let vrfCoordinatorV2_5Mock: VRFCoordinatorV2_5Mock;

          let subscriptionId: bigint;

          let mintFee: bigint;

          let deployer: SignerWithAddress;

          let user1: SignerWithAddress;

          let user2: SignerWithAddress;

          const tokenUris: string[] = [
              "ipfs://bafkreidwgbvd4cph5vjmyfjjkmgnom7nz7b6ues5cmtovclcks7dfsfiai",
              "ipfs://bafkreibdusqeb5o34gkadkroavftgjfekiuju77yaadaykacmh3q2xtx7u",
              "ipfs://bafkreib7vnqdrfs3pzz64w5vale65vkeubygpibpxh5ni7zeekb2kfg6xy",
          ];

          beforeEach(async () => {
              const accounts: SignerWithAddress[] = await ethers.getSigners();

              deployer = accounts[0];

              user1 = accounts[1];

              user2 = accounts[2];

              const mockDeployment = await hre.ignition.deploy(MockModule);

              vrfCoordinatorV2_5Mock =
                  mockDeployment.vrfCoordinatorV2_5Mock as unknown as VRFCoordinatorV2_5Mock;

              const tx = await vrfCoordinatorV2_5Mock.createSubscription();

              const receipt = await tx.wait();

              const event = receipt!.logs
                  .map((log: Log) => {
                      try {
                          return vrfCoordinatorV2_5Mock.interface.parseLog(log);
                      } catch {
                          return null;
                      }
                  })
                  .find((parsed) => parsed && parsed.name === "SubscriptionCreated");

              if (!event) {
                  throw new Error("SubscriptionCreated event not found");
              }

              subscriptionId = event.args.subId;

              await vrfCoordinatorV2_5Mock.fundSubscription(
                  subscriptionId,
                  ethers.parseEther("100"),
              );

              const chainId = network.config.chainId!;

              const cfg = networkConfig[chainId];

              const randomIpfsNftDeployment = await hre.ignition.deploy(RandomIpfsNftModule, {
                  parameters: {
                      RandomIpfsNftModule: {
                          vrfCoordinatorV2_5Address: await vrfCoordinatorV2_5Mock.getAddress(),
                          subscriptionId,
                          gasLane: cfg.gasLane!,
                          mintFee: cfg.mintFee!,
                          callbackGasLimit: cfg.callbackGasLimit!,
                          tokenUris: tokenUris,
                      },
                  },
              });

              randomIpfsNft =
                  randomIpfsNftDeployment.randomIpfsNftModule as unknown as RandomIpfsNft;

              await vrfCoordinatorV2_5Mock.addConsumer(
                  subscriptionId,
                  await randomIpfsNft.getAddress(),
              );

              mintFee = await randomIpfsNft.getMintFee();
          });

          describe("constructor", function () {
              it("initializes the NFT name and symbol correctly", async function () {
                  const name = await randomIpfsNft.name();

                  const symbol = await randomIpfsNft.symbol();

                  assert.equal(name, "Random IPFS NFT");

                  assert.equal(symbol, "RIN");
              });

              it("sets the mint fee correctly", async function () {
                  const mintFees = await randomIpfsNft.getMintFee();

                  assert.equal(mintFees.toString(), ethers.parseEther("0.01").toString());
              });

              it("initializes token counter to zero", async function () {
                  const tokenCounter = await randomIpfsNft.getTokenCounter();

                  assert.equal(tokenCounter.toString(), "0");
              });

              it("stores the subscription ID", async function () {
                  const storedSubId = await randomIpfsNft.getSubscriptionId();

                  assert.equal(storedSubId, subscriptionId);
              });

              it("initializes the contract with dog token URIs", async function () {
                  for (let i = 0; i < tokenUris.length; i++) {
                      const storedUri = await randomIpfsNft.getDogTokenUris(i);
                      assert.equal(storedUri, tokenUris[i]);
                  }
              });

              it("marks the contract as initialized", async function () {
                  const isInitialized = await randomIpfsNft.getInitialized();

                  assert.equal(isInitialized, true);
              });
          });

          describe("requestNft", function () {
              it("reverts when not enough ETH is sent", async function () {
                  await expect(randomIpfsNft.requestNft()).to.be.revertedWithCustomError(
                      randomIpfsNft,
                      "NeedMoreETHSent",
                  );
              });

              it("reverts with NeedMoreETHSent error for insufficient payment", async function () {
                  const insufficientFee = ethers.parseEther("0.001");
                  await expect(
                      randomIpfsNft.requestNft({ value: insufficientFee }),
                  ).to.be.revertedWithCustomError(randomIpfsNft, "NeedMoreETHSent");
              });

              it("emits an event and kicks off a random word request", async function () {
                  await expect(randomIpfsNft.requestNft({ value: mintFee })).to.emit(
                      randomIpfsNft,
                      "NftRequested",
                  );
              });

              it("stores the requester's address and emits NftRequested event", async function () {
                  await expect(randomIpfsNft.connect(user1).requestNft({ value: mintFee }))
                      .to.emit(randomIpfsNft, "NftRequested")
                      .withArgs(1, user1.address); // requestId starts at 1 in mock
              });

              it("accepts exact mint fee amount", async function () {
                  const tx = await randomIpfsNft.requestNft({ value: mintFee });
                  const receipt = await tx.wait();
                  assert(receipt?.status === 1);
              });

              it("accepts more than the mint fee amount", async function () {
                  const moreThanFee = ethers.parseEther("0.02");
                  const tx = await randomIpfsNft.requestNft({ value: moreThanFee });
                  const receipt = await tx.wait();
                  assert(receipt?.status === 1);
              });
          });

          describe("fulfillRandomWords", function () {
              it("mints NFT after random number returned", async function () {
                  const tx = await randomIpfsNft.requestNft({ value: mintFee });

                  await tx.wait();

                  const requestId = 1n; // Mock starts at 1

                  await expect(
                      vrfCoordinatorV2_5Mock.fulfillRandomWords(
                          requestId,
                          await randomIpfsNft.getAddress(),
                      ),
                  ).to.emit(randomIpfsNft, "NftMinted");

                  const tokenCounter = await randomIpfsNft.getTokenCounter();

                  assert.equal(tokenCounter.toString(), "1");
              });

              it("mints NFT after random number returned - test 2", async function () {
                  await new Promise<void>(async (resolve, reject) => {
                      setTimeout(resolve, 60000);
                      randomIpfsNft.once(randomIpfsNft.filters.NftMinted(), async () => {
                          try {
                              const tokenUri = await randomIpfsNft.tokenURI(0);

                              const tokenCounter = await randomIpfsNft.getTokenCounter();

                              assert.equal(tokenUri.toString().includes("ipfs://"), true);

                              assert.equal(tokenCounter.toString(), "1");

                              resolve();
                          } catch (e) {
                              console.log(e);

                              reject(e);
                          }
                      });
                      try {
                          const fee = await randomIpfsNft.getMintFee();

                          const requestNftResponse = await randomIpfsNft.requestNft({
                              value: fee.toString(),
                          });

                          const requestNftReceipt = await requestNftResponse.wait(1);

                          const event = requestNftReceipt!.logs
                              .map((log: Log) => {
                                  try {
                                      return vrfCoordinatorV2_5Mock.interface.parseLog(log);
                                  } catch {
                                      return null;
                                  }
                              })
                              .find((parsed) => parsed && parsed.name === "RandomWordsRequested");

                          if (!event) {
                              throw new Error("RandomWordsRequested event not found");
                          }

                          const requestId = event.args.requestId;

                          await vrfCoordinatorV2_5Mock.fulfillRandomWords(
                              requestId,
                              randomIpfsNft.target,
                          );
                      } catch (e) {
                          console.log(e);

                          reject(e);
                      }
                  });
              });

              it("assigns correct owner to the minted token", async function () {
                  await randomIpfsNft.connect(user1).requestNft({ value: mintFee });
                  const requestId = 1n;

                  await vrfCoordinatorV2_5Mock.fulfillRandomWords(
                      requestId,
                      await randomIpfsNft.getAddress(),
                  );

                  const owner = await randomIpfsNft.ownerOf(0);
                  assert.equal(owner, user1.address);
              });

              it("emits NftMinted event with correct parameters", async function () {
                  await randomIpfsNft.requestNft({ value: mintFee });
                  const requestId = 1n;

                  await expect(
                      vrfCoordinatorV2_5Mock.fulfillRandomWords(
                          requestId,
                          await randomIpfsNft.getAddress(),
                      ),
                  ).to.emit(randomIpfsNft, "NftMinted");
              });
          });

          describe("getBreedFromModdedRng", function () {
              it("returns PUG for random numbers 0-9", async function () {
                  const breed = await randomIpfsNft.getBreedFromModdedRng(5);
                  assert.equal(breed.toString(), "0"); // PUG = 0
              });

              it("returns SHIBA_INU for random numbers 10-39", async function () {
                  const breed = await randomIpfsNft.getBreedFromModdedRng(25);
                  assert.equal(breed.toString(), "1"); // SHIBA_INU = 1
              });

              it("returns ST_BERNARD for random numbers 40-99", async function () {
                  const breed = await randomIpfsNft.getBreedFromModdedRng(75);
                  assert.equal(breed.toString(), "2"); // ST_BERNARD = 2
              });

              it("handles edge case: moddedRng = 0 returns PUG", async function () {
                  const breed = await randomIpfsNft.getBreedFromModdedRng(0);
                  assert.equal(breed.toString(), "0");
              });

              it("handles edge case: moddedRng = 9 returns PUG", async function () {
                  const breed = await randomIpfsNft.getBreedFromModdedRng(9);
                  assert.equal(breed.toString(), "0");
              });

              it("handles edge case: moddedRng = 10 returns SHIBA_INU", async function () {
                  const breed = await randomIpfsNft.getBreedFromModdedRng(10);
                  assert.equal(breed.toString(), "1");
              });

              it("handles edge case: moddedRng = 39 returns SHIBA_INU", async function () {
                  const breed = await randomIpfsNft.getBreedFromModdedRng(39);
                  assert.equal(breed.toString(), "1");
              });

              it("handles edge case: moddedRng = 40 returns ST_BERNARD", async function () {
                  const breed = await randomIpfsNft.getBreedFromModdedRng(40);
                  assert.equal(breed.toString(), "2");
              });

              it("handles edge case: moddedRng = 99 returns ST_BERNARD", async function () {
                  const breed = await randomIpfsNft.getBreedFromModdedRng(99);
                  assert.equal(breed.toString(), "2");
              });

              it("reverts with RangeOutOfBounds for numbers >= 100", async function () {
                  await expect(
                      randomIpfsNft.getBreedFromModdedRng(100),
                  ).to.be.revertedWithCustomError(randomIpfsNft, "RangeOutOfBounds");
              });
          });

          describe("getChanceArray", function () {
              it("returns correct chance distribution [10, 30, 100]", async function () {
                  const chanceArray = await randomIpfsNft.getChanceArray();
                  assert.equal(chanceArray[0].toString(), "10");
                  assert.equal(chanceArray[1].toString(), "30");
                  assert.equal(chanceArray[2].toString(), "100");
              });
          });

          describe("withdraw", function () {
              beforeEach(async function () {
                  // Mint some NFTs to accumulate fees
                  await randomIpfsNft.connect(user1).requestNft({ value: mintFee });
                  await vrfCoordinatorV2_5Mock.fulfillRandomWords(
                      1n,
                      await randomIpfsNft.getAddress(),
                  );
              });

              it("allows owner to withdraw contract balance", async function () {
                  const initialOwnerBalance = await ethers.provider.getBalance(deployer.address);

                  const contractBalance = await ethers.provider.getBalance(
                      await randomIpfsNft.getAddress(),
                  );

                  const tx = await randomIpfsNft.withdraw();

                  const receipt = await tx.wait();

                  const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

                  const finalOwnerBalance = await ethers.provider.getBalance(deployer.address);
                  assert.equal(
                      (initialOwnerBalance + contractBalance - gasUsed).toString(),
                      finalOwnerBalance.toString(),
                  );
              });

              it("reverts when called by non-owner", async function () {
                  await expect(randomIpfsNft.connect(user1).withdraw()).to.be.reverted;
              });

              it("sets contract balance to zero after withdrawal", async function () {
                  await randomIpfsNft.withdraw();
                  const balance = await ethers.provider.getBalance(
                      await randomIpfsNft.getAddress(),
                  );
                  assert.equal(balance.toString(), "0");
              });
          });
      });
