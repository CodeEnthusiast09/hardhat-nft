// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";
import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "hardhat/console.sol";

/// @notice Thrown when attempting to initialize the contract twice
error AlreadyInitialized();

/// @notice Thrown when the user doesn't send enough ETH to mint
error NeedMoreETHSent();

/// @notice Thrown when the random number is out of expected bounds
error RangeOutOfBounds();

/**
 * @title RandomIpfsNft
 * @author [Your Name]
 * @notice This contract allows users to mint random dog NFTs with varying rarity using Chainlink VRF
 * @dev Implements ERC721URIStorage for NFT functionality and VRFConsumerBaseV2 for randomness
 * The contract uses Chainlink VRF to ensure provably fair randomness in determining NFT rarity
 */
contract RandomIpfsNft is ERC721URIStorage, VRFConsumerBaseV2Plus {
    /**
     * @notice Enum representing the three dog breeds with different rarity levels
     * @dev PUG (10% chance), SHIBA_INU (30% chance), ST_BERNARD (60% chance)
     */
    enum Breed {
        PUG,
        SHIBA_INU,
        ST_BERNARD
    }

    /* ========== Chainlink VRF Variables ========== */

    /// @notice Chainlink VRF subscription ID for funding requests
    uint256 private immutable i_subscriptionId;

    /// @notice The gas lane (key hash) to use for VRF requests
    bytes32 private immutable i_gasLane;

    /// @notice Maximum gas limit for the VRF callback function
    uint32 private immutable i_callbackGasLimit;

    /// @notice Number of block confirmations to wait before fulfilling randomness
    uint16 private constant REQUEST_CONFIRMATIONS = 3;

    /// @notice Number of random words to request from VRF (we only need 1)
    uint32 private constant NUM_WORDS = 1;

    /* ========== NFT Variables ========== */

    /// @notice The fee required to mint an NFT
    uint256 private i_mintFee;

    /// @notice Counter to track the total number of NFTs minted
    uint256 private s_tokenCounter;

    /// @notice Mapping from token ID to the breed of dog
    mapping(uint256 => Breed) private s_tokenIdToBreed;

    /// @notice Maximum value for chance calculation (represents 100%)
    uint256 internal constant MAX_CHANCE_VALUE = 100;

    /// @notice Array storing the IPFS URIs for each dog breed
    string[] internal s_dogTokenUris;

    /// @notice Flag to prevent re-initialization of the contract
    bool private s_initialized;

    /* VRF Helpers */

    /// @notice Mapping from VRF request ID to the address that made the request
    mapping(uint256 => address) private s_requestIdToSender;

    /* ========== EVENTS ========== */

    /**
     * @notice Emitted when a user requests to mint an NFT
     * @param requestId The Chainlink VRF request ID
     * @param requester The address of the user requesting the NFT
     */
    event NftRequested(uint256 indexed requestId, address requester);

    /**
     * @notice Emitted when an NFT is successfully minted
     * @param breed The breed of dog that was minted
     * @param minter The address that received the NFT
     */
    event NftMinted(Breed breed, address minter);

    /* ========== CONSTRUCTOR ========== */

    /**
     * @notice Constructs the RandomIpfsNft contract
     * @param subscriptionId Chainlink VRF subscription ID
     * @param gasLane The gas lane (key hash) for VRF requests
     * @param mintFee The fee in wei required to mint an NFT
     * @param callbackGasLimit Maximum gas for the VRF callback
     * @param dogTokenUris Array of 3 IPFS URIs for the dog breeds
     */
    constructor(
        address vrfCoordinator,
        uint256 subscriptionId,
        bytes32 gasLane,
        uint256 mintFee,
        uint32 callbackGasLimit,
        string[3] memory dogTokenUris
    ) VRFConsumerBaseV2Plus(vrfCoordinator) ERC721("Random IPFS NFT", "RIN") {
        // Removed Ownable(msg.sender) from constructor - VRFConsumerBaseV2Plus handles ownership automatically
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_mintFee = mintFee;
        i_callbackGasLimit = callbackGasLimit;
        _initializeContract(dogTokenUris);
    }

    /**
     * @notice Allows users to request minting a random NFT by paying the mint fee
     * @dev Requests randomness from Chainlink VRF and stores the requester's address
     * @return requestId The Chainlink VRF request ID for tracking
     * @custom:throws NeedMoreETHSent if msg.value is less than the mint fee
     */
    function requestNft() public payable returns (uint256 requestId) {
        if (msg.value < i_mintFee) {
            revert NeedMoreETHSent();
        }
        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: i_gasLane,
                subId: i_subscriptionId,
                requestConfirmations: REQUEST_CONFIRMATIONS,
                callbackGasLimit: i_callbackGasLimit,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );

        s_requestIdToSender[requestId] = msg.sender;
        emit NftRequested(requestId, msg.sender);
    }

    /**
     * @notice Callback function called by Chainlink VRF with random numbers
     * @dev Mints the NFT to the requester with a breed determined by the random number
     * @param requestId The VRF request ID
     * @param randomWords Array of random numbers from Chainlink VRF
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords
    ) internal override {
        address dogOwner = s_requestIdToSender[requestId];

        uint256 newItemId = s_tokenCounter;

        s_tokenCounter = s_tokenCounter + 1;

        uint256 moddedRng = randomWords[0] % MAX_CHANCE_VALUE;

        Breed dogBreed = getBreedFromModdedRng(moddedRng);

        _safeMint(dogOwner, newItemId);

        //_setTokenURI() isn't the most gas effcient operation
        _setTokenURI(newItemId, s_dogTokenUris[uint256(dogBreed)]);

        emit NftMinted(dogBreed, dogOwner);
    }

    /**
     * @notice Returns the chance array defining rarity distribution
     * @dev PUG: 10%, SHIBA_INU: 30%, ST_BERNARD: 60%
     * @return Array of cumulative chance values [10, 30, 100]
     */
    function getChanceArray() public pure returns (uint256[3] memory) {
        return [10, 30, MAX_CHANCE_VALUE];
    }

    /**
     * @notice Initializes the contract with dog token URIs
     * @dev Can only be called once during construction
     * @param dogTokenUris Array of 3 IPFS URIs for each dog breed
     * @custom:throws AlreadyInitialized if called more than once
     */
    function _initializeContract(string[3] memory dogTokenUris) private {
        if (s_initialized) {
            revert AlreadyInitialized();
        }
        s_dogTokenUris = dogTokenUris;
        s_initialized = true;
    }

    /**
     * @notice Determines the dog breed based on a random number
     * @dev Uses cumulative probability: 0-9 = PUG, 10-39 = SHIBA_INU, 40-99 = ST_BERNARD
     * @param moddedRng A random number modded by MAX_CHANCE_VALUE (0-99)
     * @return The determined Breed enum value
     * @custom:throws RangeOutOfBounds if the random number is outside expected range
     */
    function getBreedFromModdedRng(uint256 moddedRng) public pure returns (Breed) {
        if (moddedRng >= MAX_CHANCE_VALUE) {
            revert RangeOutOfBounds();
        }

        uint256 cumulativeSum = 0;

        uint256[3] memory chanceArracy = getChanceArray();

        for (uint256 i = 0; i < chanceArracy.length; i++) {
            if (moddedRng >= cumulativeSum && moddedRng < cumulativeSum + chanceArracy[i]) {
                return Breed(i);
            }
            cumulativeSum = cumulativeSum + chanceArracy[i];
        }

        revert RangeOutOfBounds();
    }

    /**
     * @notice Allows the contract owner to withdraw all accumulated ETH from mint fees
     * @dev Only callable by the contract owner
     * @custom:throws Reverts with "Transfer failed" if the ETH transfer fails
     */
    function withdraw() public onlyOwner {
        uint256 amount = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
    }

    /**
     * @notice Returns the fee required to mint an NFT
     * @return The mint fee in wei
     */
    function getMintFee() public view returns (uint256) {
        return i_mintFee;
    }

    /**
     * @notice Returns the token URI for a specific dog breed
     * @param index The breed index (0 = PUG, 1 = SHIBA_INU, 2 = ST_BERNARD)
     * @return The IPFS URI string for the specified breed
     */
    function getDogTokenUris(uint256 index) public view returns (string memory) {
        return s_dogTokenUris[index];
    }

    /**
     * @notice Returns whether the contract has been initialized
     * @return True if initialized, false otherwise
     */
    function getInitialized() public view returns (bool) {
        return s_initialized;
    }

    /**
     * @notice Returns the total number of NFTs minted
     * @return The current token counter value
     */
    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }

    /**
     * @notice Returns the subscription ID
     */
    function getSubscriptionId() public view returns (uint256) {
        return i_subscriptionId;
    }
}
