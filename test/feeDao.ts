import { expect } from "chai";
import { ethers } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { expectRevert, mineBlocks, setUp } from "./setup";

describe("feeDao", () => {
  it("proposes new tokens", async function () {
    const {
      owner,
      participant1,
      feedao,
      ric,
      catalogDAO,
      feetoken1,
      feetoken2,
    } = await setUp(true);

    // I need to give rank to the proposers before they propose

    await catalogDAO.connect(participant1).proposeNewRank("repoURL");
    await catalogDAO.connect(owner).voteOnNewRank(1, true);

    await mineBlocks(100).then(async () => {
      await catalogDAO.connect(participant1).closeRankProposal(1);
    });

    let proposals = Array(await feedao.getProposals());
    expect(JSON.stringify(proposals)).to.equal("[[]]");

    expect(await ric.balanceOf(participant1.address)).to.equal(
      ethers.utils.parseEther("70")
    );
    // the participant 1 has not enough balance to propose a token
    await expectRevert(
      () =>
        feedao
          .connect(participant1)
          .proposeNewToken(feetoken1.address, "Discussion here", "TOken name"),
      "932"
    );

    await feedao.proposeNewToken(
      feetoken1.address,
      "pickle rick!",
      "TOken name"
    );
    proposals = Array(await feedao.getProposals());
    const addr = proposals[0][0].proposal;
    expect(addr).to.equal(feetoken1.address);

    // the owner voted already because he created the proposal.

    expect(await feedao.votedAlready(0, owner.address)).to.equal(true);
    expect(await feedao.votedAlready(0, participant1.address)).to.equal(false);
    // I drop tokens to participant1 so he can vote
    await ric.transfer(participant1.address, ethers.utils.parseEther("1000"));

    await feedao
      .connect(participant1)
      .proposeNewToken(feetoken2.address, "Discussion here", "TOken name");

    // now he voted for that because he created it.
    expect(await feedao.votedAlready(1, participant1.address)).to.equal(true);
  });

  it("votes on proposed tokens", async () => {
    const { catalogDAO, owner, participant1, participant2, feedao, ric } =
      await setUp(true);
    await catalogDAO.connect(participant1).proposeNewRank("repoURL");
    await catalogDAO.connect(participant2).proposeNewRank("repoURL");

    await catalogDAO.connect(owner).voteOnNewRank(1, true);
    await catalogDAO.connect(owner).voteOnNewRank(2, true);

    await mineBlocks(100).then(async () => {
      await catalogDAO.connect(participant1).closeRankProposal(1);
      await catalogDAO.connect(participant2).closeRankProposal(2);

      await feedao.proposeNewToken(ric.address, "pickle rick!", "TOken name");

      await expectRevert(
        () => feedao.connect(participant1).voteOnToken(0, true),
        "932"
      );

      await ric.transfer(participant1.address, ethers.utils.parseEther("1000"));
      await ric.transfer(participant2.address, ethers.utils.parseEther("1000"));

      expect(await feedao.connect(participant1).voteOnToken(0, true)).to.emit(
        feedao,
        "VoteOnToken"
      );

      expect(await feedao.votedAlready(0, participant1.address)).to.equal(true);
      await expectRevert(
        () => feedao.connect(participant1).voteOnToken(0, true),
        "933"
      );
      await expectRevert(() => feedao.closeTokenProposal(0), "915");

      await mineBlocks(10).then(async () => {
        await expectRevert(
          () => feedao.connect(participant1).closeTokenProposal(0),
          "914"
        );

        await expectRevert(
          () => feedao.connect(participant2).voteOnToken(0, true),
          "913"
        );

        expect(await feedao.closeTokenProposal(0)).to.emit(
          feedao,
          "CloseProposal"
        );

        await expectRevert(() => feedao.closeTokenProposal(0), "917");

        const tokens = await feedao.getTokens();

        expect(tokens[0].token).equal(ric.address);
      });
    });
  });
  it("proposes a token that dont get elected", async () => {
    const {
      catalogDAO,
      owner,
      participant1,
      participant2,

      feedao,
      ric,
    } = await setUp(true);
    await catalogDAO.connect(participant1).proposeNewRank("repoURL");
    await catalogDAO.connect(participant2).proposeNewRank("repoURL");

    await catalogDAO.connect(owner).voteOnNewRank(1, true);
    await catalogDAO.connect(owner).voteOnNewRank(2, true);
    await mineBlocks(100).then(async () => {
      await catalogDAO.connect(participant1).closeRankProposal(1);
      await catalogDAO.connect(participant2).closeRankProposal(2);

      await feedao.proposeNewToken(ric.address, "pickle rick!", "TOken name");

      await expectRevert(
        () => feedao.connect(participant1).voteOnToken(0, true),
        "932"
      );

      await ric.transfer(participant1.address, ethers.utils.parseEther("1000"));
      await ric.transfer(participant2.address, ethers.utils.parseEther("1000"));

      expect(await feedao.connect(participant1).voteOnToken(0, false)).to.emit(
        feedao,
        "VoteOnToken"
      );

      await mineBlocks(10).then(async () => {
        expect(await feedao.closeTokenProposal(0)).to.emit(
          feedao,
          "CloseProposal"
        );

        const tokens = await feedao.getTokens();
        expect(tokens.length).equal(0);
      });
    });
  });

  it("proposes multiple tokens, some get elected", async () => {
    const {
      catalogDAO,
      owner,
      participant1,
      participant2,
      participant3,
      participant4,
      feedao,
      ric,
    } = await setUp(true);
    await catalogDAO.connect(participant1).proposeNewRank("repoURL");
    await catalogDAO.connect(participant2).proposeNewRank("repoURL");
    await catalogDAO.connect(participant3).proposeNewRank("repoURL");
    await catalogDAO.connect(participant4).proposeNewRank("repoURL");

    await catalogDAO.connect(owner).voteOnNewRank(1, true);
    await catalogDAO.connect(owner).voteOnNewRank(2, true);
    await catalogDAO.connect(owner).voteOnNewRank(3, true);
    await catalogDAO.connect(owner).voteOnNewRank(4, true);

    await mineBlocks(100).then(async () => {
      await catalogDAO.connect(participant1).closeRankProposal(1);
      await catalogDAO.connect(participant2).closeRankProposal(2);
      await catalogDAO.connect(participant3).closeRankProposal(3);
      await catalogDAO.connect(participant4).closeRankProposal(4);

      await ric.transfer(participant1.address, ethers.utils.parseEther("1000"));
      await ric.transfer(participant2.address, ethers.utils.parseEther("1000"));
      await ric.transfer(participant3.address, ethers.utils.parseEther("1000"));
      await ric.transfer(participant4.address, ethers.utils.parseEther("1000"));

      await feedao.proposeNewToken(ric.address, "pickle rick!", "TOken name");
      // VOTED IN
      expect(await feedao.connect(participant1).voteOnToken(0, true)).to.emit(
        feedao,
        "VoteOnToken"
      );

      expect(await feedao.connect(participant2).voteOnToken(0, false)).to.emit(
        feedao,
        "VoteOnToken"
      );

      expect(await feedao.connect(participant3).voteOnToken(0, true)).to.emit(
        feedao,
        "VoteOnToken"
      );

      expect(await feedao.connect(participant4).voteOnToken(0, true)).to.emit(
        feedao,
        "VoteOnToken"
      );

      // VOTED DOWN
      await feedao.proposeNewToken(ric.address, "pickle rick1!", "TOken name");
      expect(await feedao.connect(participant1).voteOnToken(1, false)).to.emit(
        feedao,
        "VoteOnToken"
      );

      expect(await feedao.connect(participant2).voteOnToken(1, false)).to.emit(
        feedao,
        "VoteOnToken"
      );

      expect(await feedao.connect(participant3).voteOnToken(1, false)).to.emit(
        feedao,
        "VoteOnToken"
      );

      expect(await feedao.connect(participant4).voteOnToken(1, false)).to.emit(
        feedao,
        "VoteOnToken"
      );

      // A TIE, SO VOTED NO
      await feedao.proposeNewToken(ric.address, "pickle rick2!", "TOken name");

      expect(await feedao.connect(participant1).voteOnToken(2, true)).to.emit(
        feedao,
        "VoteOnToken"
      );

      expect(await feedao.connect(participant2).voteOnToken(2, true)).to.emit(
        feedao,
        "VoteOnToken"
      );

      expect(await feedao.connect(participant3).voteOnToken(2, false)).to.emit(
        feedao,
        "VoteOnToken"
      );

      expect(await feedao.connect(participant4).voteOnToken(2, false)).to.emit(
        feedao,
        "VoteOnToken"
      );

      // VOTED IN
      await feedao.proposeNewToken(ric.address, "pickle rick3!", "TOken name");
      expect(await feedao.connect(participant1).voteOnToken(3, true)).to.emit(
        feedao,
        "VoteOnToken"
      );

      expect(await feedao.connect(participant2).voteOnToken(3, true)).to.emit(
        feedao,
        "VoteOnToken"
      );

      expect(await feedao.connect(participant3).voteOnToken(3, true)).to.emit(
        feedao,
        "VoteOnToken"
      );

      expect(await feedao.connect(participant4).voteOnToken(3, false)).to.emit(
        feedao,
        "VoteOnToken"
      );

      await mineBlocks(10).then(async () => {
        expect(await feedao.closeTokenProposal(0)).to.emit(
          feedao,
          "CloseProposal"
        );
        expect(await feedao.closeTokenProposal(1)).to.emit(
          feedao,
          "CloseProposal"
        );
        expect(await feedao.closeTokenProposal(2)).to.emit(
          feedao,
          "CloseProposal"
        );
        expect(await feedao.closeTokenProposal(3)).to.emit(
          feedao,
          "CloseProposal"
        );

        const tokens = await feedao.getTokens();
        // 2 tokens got voted in
        expect(tokens.length).equal(2);
      });
    });
  });

  it("makes withdrawal from one voted-in erc20", async () => {
    const {
      catalogDAO,
      owner,
      participant1,
      participant2,
      feedao,
      ric,
      feetoken1,
      ricvault,
    } = await setUp(true);
    await catalogDAO.connect(participant1).proposeNewRank("repoURL");
    await catalogDAO.connect(participant2).proposeNewRank("repoURL");

    await catalogDAO.connect(owner).voteOnNewRank(1, true);
    await catalogDAO.connect(owner).voteOnNewRank(2, true);

    await mineBlocks(100).then(async () => {
      await catalogDAO.connect(participant1).closeRankProposal(1);
      await catalogDAO.connect(participant2).closeRankProposal(2);

      await feedao.proposeNewToken(
        feetoken1.address,
        "pickle rick! discussion here",
        "TOken name"
      );

      await ric.transfer(participant1.address, ethers.utils.parseEther("1000"));
      await ric.transfer(participant2.address, ethers.utils.parseEther("1000"));

      expect(await feedao.connect(participant1).voteOnToken(0, true)).to.emit(
        feedao,
        "VoteOnToken"
      );
      expect(await feedao.connect(participant2).voteOnToken(0, true)).to.emit(
        feedao,
        "VoteOnToken"
      );

      await mineBlocks(10).then(async () => {
        expect(await feedao.closeTokenProposal(0)).to.emit(
          feedao,
          "CloseProposal"
        );

        const tokens = await feedao.getTokens();
        expect(tokens.length).equal(1);
        expect(tokens[0].token).to.equal(feetoken1.address);

        // NOW FROM HERE I SHOULD BE ABLE TO CALCULATE WITHDRAW

        // this should be 0 because the feedao has 0 balance
        expect(
          await feedao.calculateWithdraw(
            tokens[0].token,
            ethers.utils.parseEther("100")
          )
        ).to.equal(ethers.utils.parseEther("0"));
        // Now I transfer it balance
        await feetoken1.transfer(
          feedao.address,
          ethers.utils.parseEther("10000")
        );

        // If the participant uses all his balance, it's 1.07
        expect(
          await feedao.calculateWithdraw(
            tokens[0].token,
            await ric.balanceOf(participant1.address)
          )
        ).to.equal(ethers.utils.parseEther("1.07"));

        // // Ricvault lockFor should throw because of allowance
        await expectRevert(
          () =>
            feedao.withdrawOne(tokens[0].token, ethers.utils.parseEther("100")),
          "exceeds allowance"
        );
        // Approving spend
        await ric
          .connect(participant1)
          .approve(ricvault.address, await ric.balanceOf(participant1.address));

        // // Now the withdraw should succeed
        expect(
          await feedao
            .connect(participant1)
            .withdrawOne(
              tokens[0].token,
              await ric.balanceOf(participant1.address)
            )
        ).to.emit(feedao, "WithdrawToken");
        // Participant1 got the feetoken
        expect(await feetoken1.balanceOf(participant1.address)).to.equal(
          ethers.utils.parseEther("1.07")
        );
        // Ric balance is zero because the transfer
        expect(await ric.balanceOf(participant1.address)).to.equal(
          ethers.utils.parseEther("0")
        );
        // The total locked in the vault is 1070 now, the previous balance of the participant
        expect(await ricvault.getTotalLocked()).to.equal(
          ethers.utils.parseEther("1070")
        );
        const lockIndex = await ricvault.getLockIndex(participant1.address);
        expect(lockIndex).to.equal(1);

        const vaultContent = await ricvault.getVaultContent(
          participant1.address,
          lockIndex
        );
        // Just making sure the vault has the balance
        expect(vaultContent.lockedAmount).to.equal(
          ethers.utils.parseEther("1070")
        );
      });
    });
  });
  it("makes withdrawal from three voted-in erc20s", async () => {
    const {
      catalogDAO,
      owner,
      participant1,
      participant2,
      feedao,
      ric,
      feetoken1,
      feetoken2,
      feetoken3,
      feetoken4,
      ricvault,
    } = await setUp(true);

    await catalogDAO.connect(participant1).proposeNewRank("repoURL");
    await catalogDAO.connect(participant2).proposeNewRank("repoURL");

    await catalogDAO.connect(owner).voteOnNewRank(1, true);
    await catalogDAO.connect(owner).voteOnNewRank(2, true);
    await ric.transfer(participant1.address, ethers.utils.parseEther("1000"));
    await ric.transfer(participant2.address, ethers.utils.parseEther("1000"));

    await mineBlocks(100).then(async () => {
      await catalogDAO.connect(participant1).closeRankProposal(1);
      await catalogDAO.connect(participant2).closeRankProposal(2);

      await feedao.proposeNewToken(
        feetoken1.address,
        "1discussion here",
        "1token name"
      );

      expect(await feedao.connect(participant1).voteOnToken(0, true)).to.emit(
        feedao,
        "VoteOnToken"
      );
      expect(await feedao.connect(participant2).voteOnToken(0, true)).to.emit(
        feedao,
        "VoteOnToken"
      );

      await feedao.proposeNewToken(
        feetoken2.address,
        "2discussion here",
        "2token name"
      );

      expect(await feedao.connect(participant1).voteOnToken(1, true)).to.emit(
        feedao,
        "VoteOnToken"
      );
      expect(await feedao.connect(participant2).voteOnToken(1, true)).to.emit(
        feedao,
        "VoteOnToken"
      );

      await feedao.proposeNewToken(
        feetoken3.address,
        "3discussion here",
        "3token name"
      );
      expect(await feedao.connect(participant1).voteOnToken(2, true)).to.emit(
        feedao,
        "VoteOnToken"
      );
      expect(await feedao.connect(participant2).voteOnToken(2, true)).to.emit(
        feedao,
        "VoteOnToken"
      );

      await feedao.proposeNewToken(
        feetoken4.address,
        "4discussion here",
        "4token name"
      );

      expect(await feedao.connect(participant1).voteOnToken(3, true)).to.emit(
        feedao,
        "VoteOnToken"
      );
      expect(await feedao.connect(participant2).voteOnToken(3, true)).to.emit(
        feedao,
        "VoteOnToken"
      );

      await mineBlocks(10).then(async () => {
        expect(await feedao.closeTokenProposal(0)).to.emit(
          feedao,
          "CloseProposal"
        );
        expect(await feedao.closeTokenProposal(1)).to.emit(
          feedao,
          "CloseProposal"
        );
        expect(await feedao.closeTokenProposal(2)).to.emit(
          feedao,
          "CloseProposal"
        );
        expect(await feedao.closeTokenProposal(3)).to.emit(
          feedao,
          "CloseProposal"
        );
        const tokens = await feedao.getTokens();
        expect(tokens.length).equal(4);
        // so I got 4 tokens voted in,
        // I transfer some of it to the feedao
        await feetoken1.transfer(
          feedao.address,
          ethers.utils.parseEther("100")
        );
        await feetoken2.transfer(
          feedao.address,
          ethers.utils.parseEther("100")
        );
        await feetoken3.transfer(
          feedao.address,
          ethers.utils.parseEther("100")
        );
        await feetoken4.transfer(
          feedao.address,
          ethers.utils.parseEther("100")
        );

        expect(await feetoken1.balanceOf(feedao.address)).to.equal(
          ethers.utils.parseEther("100")
        );
        expect(await feetoken2.balanceOf(feedao.address)).to.equal(
          ethers.utils.parseEther("100")
        );
        expect(await feetoken3.balanceOf(feedao.address)).to.equal(
          ethers.utils.parseEther("100")
        );
        expect(await feetoken4.balanceOf(feedao.address)).to.equal(
          ethers.utils.parseEther("100")
        );

        // Now I withdraw from 3 tokens
        // Putting all the balance will result in
        expect(
          await feedao.calculateWithdraw(
            feetoken2.address,
            await ric.balanceOf(participant1.address)
          )
        ).to.equal(ethers.utils.parseEther("0.0107"));

        await expectRevert(
          () =>
            feedao
              .connect(participant1)
              .withdrawThree(
                feetoken1.address,
                feetoken2.address,
                feetoken3.address,
                ethers.utils.parseEther("100000")
              ),
          "934"
        );
        // Approving spend
        await ric
          .connect(participant1)
          .approve(ricvault.address, await ric.balanceOf(participant1.address));

        await feedao
          .connect(participant1)
          .withdrawThree(
            feetoken1.address,
            feetoken2.address,
            feetoken3.address,
            await ric.balanceOf(participant1.address)
          );

        // Checking the balances
        expect(await ric.balanceOf(participant1.address)).to.equal(
          ethers.utils.parseEther("0")
        );

        expect(await feetoken1.balanceOf(participant1.address)).to.equal(
          ethers.utils.parseEther("0.0107")
        );

        expect(await feetoken2.balanceOf(participant1.address)).to.equal(
          ethers.utils.parseEther("0.0107")
        );

        expect(await feetoken3.balanceOf(participant1.address)).to.equal(
          ethers.utils.parseEther("0.0107")
        );

        const lockIndex = await ricvault.getLockIndex(participant1.address);
        expect(lockIndex).to.equal(1);

        const vaultContent = await ricvault.getVaultContent(
          participant1.address,
          lockIndex
        );
        // Just making sure the vault has the balance
        expect(vaultContent.lockedAmount).to.equal(
          ethers.utils.parseEther("1070")
        );
      });
    });
  });

  it("Expresses opinion on an accepted token", async function () {
    const {
      catalogDAO,
      owner,
      participant1,
      participant2,
      feedao,
      ric,
      feetoken1,
    } = await setUp(true);

    await catalogDAO.connect(participant1).proposeNewRank("repoURL");
    await catalogDAO.connect(participant2).proposeNewRank("repoURL");

    await catalogDAO.connect(owner).voteOnNewRank(1, true);
    await catalogDAO.connect(owner).voteOnNewRank(2, true);
    await ric.transfer(participant1.address, ethers.utils.parseEther("1000"));
    await ric.transfer(participant2.address, ethers.utils.parseEther("1000"));

    await mineBlocks(100).then(async () => {
      await catalogDAO.connect(participant1).closeRankProposal(1);
      await catalogDAO.connect(participant2).closeRankProposal(2);

      await feedao.proposeNewToken(
        feetoken1.address,
        "1discussion here",
        "1token name"
      );

      expect(await feedao.connect(participant1).voteOnToken(0, true)).to.emit(
        feedao,
        "VoteOnToken"
      );
      expect(await feedao.connect(participant2).voteOnToken(0, true)).to.emit(
        feedao,
        "VoteOnToken"
      );

      await mineBlocks(10).then(async () => {
        expect(await feedao.closeTokenProposal(0)).to.emit(
          feedao,
          "CloseProposal"
        );
        let tokens = await feedao.getTokens();
        expect(tokens.length).equal(1);
        // I can like or dislike the tokens

        await feedao.connect(participant1).expressOpinion(0, true);
        await feedao.connect(participant2).expressOpinion(0, false);

        await expectRevert(
          () => feedao.connect(participant2).expressOpinion(0, true),
          "938"
        );
        tokens = await feedao.getTokens();
        expect(tokens[0].likes).to.equal(1);
        expect(tokens[0].dislikes).to.equal(1);
      });
    });
  });
});