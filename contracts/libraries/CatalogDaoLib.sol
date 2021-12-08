//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

struct CatalogState {
    uint256 pollPeriod;
    mapping(address => uint8) rank;
    mapping(uint256 => AcceptedSmartContractProposal) acceptedSCProposals;
    uint256 acceptedSCProposalIndex;
    mapping(uint256 => RankProposal) rankProposals;
    uint256 rankProposalIndex;
    mapping(uint256 => SmartContractProposal) smartContractProposals;
    uint256 smartContractProposalIndex;
    mapping(bytes32 => bool) voted;
    mapping(address => MyProposals) myProposals;
    mapping(uint256 => RemovalProposal) removalProposals;
    uint256 removalProposalIndex;
}

struct MyProposals {
    uint256[] rank;
    uint256[] smartContract;
    uint256[] acceptedSCProposals;
    uint256[] removedFromMe;
    uint256[] removal;
}

struct RankProposal {
    string repository;
    address creator;
    uint256 createdBlock;
    uint256 approvals;
    uint256 rejections;
    bool closed;
}

struct SmartContractProposal {
    string arweaveTxId;
    address creator;
    uint256 createdBlock;
    uint256 approvals;
    uint256 rejections;
    bool closed;
}

struct AcceptedSmartContractProposal {
    string arweaveTxId;
    address creator;
    bool removed;
}

struct RemovalProposal {
    string discussionUrl;
    address creator;
    bool malicious;
    uint256 acceptedIndex; // The index from acceptedSCProposals
    uint256 createdBlock;
    uint256 approvals;
    uint256 rejections;
    bool closed;
}

library CatalogDaoLib {
    // <-- Rank functions start -->

    function proposeNewRank(
        CatalogState storage self,
        string calldata _repository
    ) external returns (uint256) {
        require(self.rank[msg.sender] == 0, "900");

        self.rankProposalIndex += 1;
        self.rankProposals[self.rankProposalIndex] = RankProposal({
            repository: _repository,
            creator: msg.sender,
            createdBlock: block.number,
            approvals: 0,
            rejections: 0,
            closed: false
        });
        bytes32 rankHash = rankProposalHash(
            self.rankProposals[self.rankProposalIndex],
            msg.sender
        );
        self.voted[rankHash] = true;
        self.myProposals[msg.sender].rank.push(self.rankProposalIndex);
        return self.rankProposalIndex;
    }

    function rankProposalHash(RankProposal memory _proposal, address _voter)
        internal
        pure
        returns (bytes32)
    {
        // This hashing is used to access who voted so I'm not using the approvals or the rejections
        return
            keccak256(
                abi.encodePacked(
                    _proposal.repository,
                    _proposal.creator,
                    _proposal.createdBlock,
                    _voter
                )
            );
    }

    function votedAlreadyOnRank(
        CatalogState storage self,
        uint256 rankIndex,
        address _voter
    ) public view returns (bool) {
        bytes32 rankHash = rankProposalHash(
            self.rankProposals[rankIndex],
            _voter
        );
        return self.voted[rankHash];
    }

    function voteOnNewRank(
        CatalogState storage self,
        uint256 rankIndex,
        bool accepted
    ) external returns (bool) {
        // A minimum of 1 rank is required for voting
        require(self.rank[msg.sender] > 0, "901");

        bytes32 rankHash = rankProposalHash(
            self.rankProposals[rankIndex],
            msg.sender
        );
        // Checking if the sender already voted
        require(!self.voted[rankHash], "902");

        // Checking if the voting period is over
        require(
            self.rankProposals[rankIndex].createdBlock + self.pollPeriod >
                block.number,
            "903"
        );

        if (accepted) {
            self.rankProposals[rankIndex].approvals += self.rank[msg.sender];
        } else {
            self.rankProposals[rankIndex].rejections += self.rank[msg.sender];
        }

        self.voted[rankHash] = true;

        return true;
    }

    function closeRankProposal(CatalogState storage self, uint256 rankIndex)
        external
        returns (bool)
    {
        // Everybody needs to close their own proposals

        require(self.rankProposals[rankIndex].creator == msg.sender, "904");
        require(!self.rankProposals[rankIndex].closed, "907");
        require(
            self.rankProposals[rankIndex].createdBlock + self.pollPeriod <
                block.number,
            "905"
        );

        self.rankProposals[rankIndex].closed = true;

        if (self.rankProposals[rankIndex].approvals >= 10) {
            if (
                self.rankProposals[rankIndex].approvals >
                self.rankProposals[rankIndex].rejections
            ) {
                // If the proposal was approved, I increase the rank of the creator.
                address _creator = self.rankProposals[rankIndex].creator;
                self.rank[_creator] = 1;

                return true;
            }
        }

        return false;
    }

    //<-- Rank functions end -->
    //<-- Smart contract proposal functions start -->

    function proposeNewSmartContract(
        CatalogState storage self,
        string calldata _arweaveTxId
    ) external returns (uint256) {
        // The sender must have high enough rank
        require(self.rank[msg.sender] > 0, "901");
        self.smartContractProposalIndex += 1;

        self.smartContractProposals[
            self.smartContractProposalIndex
        ] = SmartContractProposal({
            arweaveTxId: _arweaveTxId,
            creator: msg.sender,
            createdBlock: block.number,
            approvals: self.rank[msg.sender],
            rejections: 0,
            closed: false
        });

        bytes32 sCHash = smartContractProposalHash(
            self.smartContractProposals[self.smartContractProposalIndex],
            msg.sender
        );
        self.voted[sCHash] = true;
        self.myProposals[msg.sender].smartContract.push(
            self.smartContractProposalIndex
        );
        return self.smartContractProposalIndex;
    }

    function smartContractProposalHash(
        SmartContractProposal memory _proposal,
        address _voter
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    _proposal.arweaveTxId,
                    _proposal.creator,
                    _proposal.createdBlock,
                    _voter
                )
            );
    }

    function votedAlreadyOnSC(
        CatalogState storage self,
        uint256 _sCIndex,
        address _voter
    ) public view returns (bool) {
        bytes32 scHash = smartContractProposalHash(
            self.smartContractProposals[_sCIndex],
            _voter
        );
        return self.voted[scHash];
    }

    function voteOnNewSC(
        CatalogState storage self,
        uint256 sCIndex,
        bool accepted
    ) external returns (bool) {
        // A minimum of 1 rank is required for voting
        require(self.rank[msg.sender] > 0, "901");
        bytes32 scHash = smartContractProposalHash(
            self.smartContractProposals[sCIndex],
            msg.sender
        );

        require(!self.voted[scHash], "902");
        // Checking if the voting period is over
        require(
            self.smartContractProposals[sCIndex].createdBlock +
                self.pollPeriod >
                block.number,
            "903"
        );
        if (accepted) {
            self.smartContractProposals[sCIndex].approvals += self.rank[
                msg.sender
            ];
            self.smartContractProposals[sCIndex].rejections += self.rank[
                msg.sender
            ];
        }
        self.voted[scHash] = true;
        return true;
    }

    function closeSmartContractProposal(
        CatalogState storage self,
        uint256 sCIndex
    ) external returns (bool) {
        // Everybody needs to close their own proposals
        // From now on the creator can only be msg.sender

        require(
            self.smartContractProposals[sCIndex].creator == msg.sender,
            "904"
        );

        require(
            self.smartContractProposals[sCIndex].createdBlock +
                self.pollPeriod <
                block.number,
            "905"
        );
        require(!self.smartContractProposals[sCIndex].closed, "907");

        self.smartContractProposals[sCIndex].closed = true;

        // if the amount of approvals is more than 10 and the sender didnt get his rank reduced in the meanwhile
        if (
            self.smartContractProposals[sCIndex].approvals >= 10 &&
            self.rank[msg.sender] > 0
        ) {
            if (
                self.smartContractProposals[sCIndex].approvals >
                self.smartContractProposals[sCIndex].rejections
            ) {
                self.acceptedSCProposalIndex += 1;
                self.acceptedSCProposals[
                    self.acceptedSCProposalIndex
                ] = AcceptedSmartContractProposal({
                    arweaveTxId: self
                        .smartContractProposals[sCIndex]
                        .arweaveTxId,
                    creator: msg.sender,
                    removed: false
                });

                self.myProposals[msg.sender].acceptedSCProposals.push(
                    self.acceptedSCProposalIndex
                );
                // If the proposal was accepted, I increase the Rank of the creator
                // If the rank of the sender was
                if (
                    self.rank[msg.sender] == 1 &&
                    self.myProposals[msg.sender].removedFromMe.length == 0
                ) {
                    if (
                        self
                            .myProposals[msg.sender]
                            .acceptedSCProposals
                            .length >= 3
                    ) self.rank[msg.sender] = 2;
                }

                // If the rank of the sender is 2, I need 3 accepted proposals to increase it to 3
                // however if a smart contract was removed from the address, the rank can be max 2 .
                if (
                    self.rank[msg.sender] == 2 &&
                    self.myProposals[msg.sender].removedFromMe.length == 0
                ) {
                    if (
                        self
                            .myProposals[msg.sender]
                            .acceptedSCProposals
                            .length >= 6
                    ) {
                        self.rank[msg.sender] = 3;
                    }
                }

                return true;
            }
        }
        return false;
    }

    //<-- Smart contract proposal functions end -->

    //<-- Removal proposals start -->

    function proposeContractRemoval(
        CatalogState storage self,
        string calldata _discussionUrl,
        uint256 _acceptedSCIndex,
        bool _malicious
    ) external returns (uint256) {
        require(self.rank[msg.sender] > 0, "901");
        self.removalProposalIndex += 1;
        self.removalProposals[self.removalProposalIndex] = RemovalProposal({
            discussionUrl: _discussionUrl,
            creator: msg.sender,
            malicious: _malicious,
            acceptedIndex: _acceptedSCIndex,
            createdBlock: block.number,
            approvals: self.rank[msg.sender],
            rejections: 0,
            closed: false
        });

        bytes32 remHash = removalProposalHash(
            self.removalProposals[self.removalProposalIndex],
            msg.sender
        );

        self.voted[remHash] = true;

        self.myProposals[msg.sender].removal.push(self.removalProposalIndex);
        return self.removalProposalIndex;
    }

    function removalProposalHash(
        RemovalProposal memory _proposal,
        address _voter
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    _proposal.discussionUrl,
                    _proposal.creator,
                    _proposal.malicious,
                    _proposal.acceptedIndex,
                    _voter
                )
            );
    }

    function votedAlreadyOnRemoval(
        CatalogState storage self,
        uint256 removalIndex,
        address _voter
    ) external view returns (bool) {
        bytes32 remHash = removalProposalHash(
            self.removalProposals[removalIndex],
            _voter
        );
        return self.voted[remHash];
    }

    function voteOnRemoval(
        CatalogState storage self,
        uint256 removalIndex,
        bool accepted
    ) external returns (bool) {
        // A minimum of 1 rank is required for voting
        require(self.rank[msg.sender] > 0, "901");

        // You can't vote on your own removal
        require(
            self
                .acceptedSCProposals[
                    self.removalProposals[removalIndex].acceptedIndex
                ]
                .creator != msg.sender,
            "906"
        );

        bytes32 remHash = removalProposalHash(
            self.removalProposals[removalIndex],
            msg.sender
        );

        require(!self.voted[remHash], "902");

        //Checking if the voting period is over
        require(
            self.removalProposals[removalIndex].createdBlock + self.pollPeriod >
                block.number,
            "903"
        );

        if (accepted) {
            self.removalProposals[removalIndex].approvals += self.rank[
                msg.sender
            ];
        } else {
            self.removalProposals[removalIndex].rejections += self.rank[
                msg.sender
            ];
        }

        self.voted[remHash] = true;

        return true;
    }

    function closeRemovalProposal(
        CatalogState storage self,
        uint256 removalIndex
    ) external returns (bool) {
        // Everybody closes their own proposals
        RemovalProposal memory prop = self.removalProposals[removalIndex];
        require(prop.creator == msg.sender, "904");

        require(prop.createdBlock + self.pollPeriod < block.number, "905");
        require(!self.removalProposals[removalIndex].closed, "907");

        self.removalProposals[removalIndex].closed = true;

        if (prop.approvals >= 10) {
            if (prop.approvals > prop.rejections) {
                // If the proposal was accepted, I remove the approved proposal
                // If the contract was marked malicious, I remove the rank of it's creator
                self.acceptedSCProposals[prop.acceptedIndex].removed = true;

                // If it was marked malicious, I reduce the rank of the offender
                if (self.removalProposals[removalIndex].malicious) {
                    self.rank[
                        self.acceptedSCProposals[prop.acceptedIndex].creator
                    ] = 0;
                }
            }
        }

        return false;
    }

    //<-- Removal proposal functions end -->
}
