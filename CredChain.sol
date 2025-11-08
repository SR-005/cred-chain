// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./node_modules/@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./node_modules/@openzeppelin/contracts/access/Ownable.sol";


contract CredChain is ERC721URIStorage, Ownable {
    struct Project {
        address client;
        string projectHash; // SHA-256 hex
        string link;        // IPFS/GitHub link
        bool verified;
    }

    struct Review {
        address reviewer;
        uint8 rating;
        string commentHash; // could be IPFS
    }

    mapping(address => bool) public verifiedUsers;
    mapping(address => Project[]) public userProjects;
    mapping(address => Review[]) public userReviews;
    mapping(address => uint256) public projectCount; // verified project counts

    uint256 public tokenCounter;

    event UserVerified(address indexed user, bool status);
    event ProjectAdded(address indexed user, uint index, string projectHash, string link);
    event ProjectVerified(address indexed user, uint index, bool status);
    event ReviewAdded(address indexed freelancer, address indexed reviewer, uint8 rating);

  constructor() ERC721("CredChainBadge", "CCB") Ownable() {
    tokenCounter = 1;
    }

    // Admin/back-end calls to set a user as verified (after off-chain verification)
    function setUserVerified(address user, bool status) external onlyOwner {
        verifiedUsers[user] = status;
        emit UserVerified(user, status);
    }

    // Add project (backend should call this after computing hash)
    function addProject(address user, address client,string calldata projectHash, string calldata link) external onlyOwner {
    require(verifiedUsers[user], "User not verified");
    userProjects[user].push(Project(client, projectHash, link, false));
    emit ProjectAdded(user, userProjects[user].length - 1, projectHash, link);
}


    // Backend (verifier) sets project verified flag
    function verifyProject(address user, uint index, bool status) external onlyOwner {
        require(index < userProjects[user].length, "Invalid index");
        Project storage p = userProjects[user][index];
        p.verified = status;
        if (status) {
            projectCount[user] += 1;
            _checkAndMintBadge(user);
        }
        emit ProjectVerified(user, index, status);
    }

    // Clients (verified) submit reviews; reviewer must be verified user
    function submitReview(address freelancer, uint8 rating, string calldata commentHash) external {
        require(verifiedUsers[msg.sender], "Reviewer not verified");
        userReviews[freelancer].push(Review(msg.sender, rating, commentHash));
        emit ReviewAdded(freelancer, msg.sender, rating);
    }

    // Internal badge logic — auto-mint on milestones
    function _checkAndMintBadge(address user) internal {
        uint256 count = projectCount[user];
        if (count == 3 || count == 5 || count == 7 || count == 10) {
            string memory uri = _getBadgeURI(count);
            _mintBadge(user, uri);
        }
    }

    // Mint badge to user
    function _mintBadge(address user, string memory uri) internal {
        uint256 newId = tokenCounter;
        _safeMint(user, newId);
        _setTokenURI(newId, uri);
        tokenCounter += 1;
    }

    // Owner can mint badges manually when needed
    function mintBadge(address user, string calldata uri) external onlyOwner {
        _mintBadge(user, uri);
    }

    // Configure URIs for milestones (dev: replace IPFS with real URIs)
    function _getBadgeURI(uint256 milestone) internal pure returns (string memory) {
        if (milestone == 3) return "ipfs://QmBadge3";
        if (milestone == 5) return "ipfs://QmBadge5";
        if (milestone == 7) return "ipfs://QmBadge7";
        if (milestone == 10) return "ipfs://QmBadge10";
        return "";
    }

    // Convenience getters
    function getProject(address user, uint index) external view returns (string memory, string memory, bool) {
        Project storage p = userProjects[user][index];
        return (p.projectHash, p.link, p.verified);
    }

    function getProjectCount(address user) external view returns (uint) {
        return userProjects[user].length;
    }

    function getVerifiedProjectCount(address user) external view returns (uint) {
        return projectCount[user];
    }
}
