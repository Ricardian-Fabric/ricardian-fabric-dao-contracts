import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, network } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { CatalogDao, DaoStaking, Ric } from "../typechain";
export const parseEther = (val: string): any => ethers.utils.parseEther(val);

export async function setUp(withStake: boolean): Promise<any> {
  const [
    owner,
    participant1,
    participant2,
    participant3,
    participant4,
    participant5,
    buyer1,
    buyer2,
    buyer3,
    buyer4,
    buyer5,
    buyer6,
    buyer7,
    buyer8,
    buyer9,
    buyer10,
    buyer11,
    buyer12,
    buyer13,
    buyer14,
  ] = await ethers.getSigners();

  // A simple terms for signing up, which means accepting the terms
  const SignUp = await ethers.getContractFactory("SimpleTerms");
  const signUp = await SignUp.deploy();
  const signup = await signUp.deployed();

  const RicToken = await ethers.getContractFactory("Ric");

  const ricToken = await RicToken.deploy(ethers.utils.parseEther("100000000"));

  const ric = await ricToken.deployed();

  const RICSale = await ethers.getContractFactory("RicSale");

  const RicSale = await RICSale.deploy(owner.address, ric.address, 2);
  const ricsale = await RicSale.deployed();

  const DAOStaking = await ethers.getContractFactory("DaoStaking");

  const DaoStaking = await DAOStaking.deploy(
    ric.address,
    100 // The staking is locked for only 100 blocks for testing purposeszs
  );
  const daoStaking = await DaoStaking.deployed();
  const CatalogDAOLib = await ethers.getContractFactory("CatalogDaoLib");
  const catalogDAOLib = await CatalogDAOLib.deploy();
  const catalogdaolib = await catalogDAOLib.deployed();
  const CatalogDAO = await ethers.getContractFactory("CatalogDao", {
    libraries: { CatalogDaoLib: catalogdaolib.address },
  });

  // @ts-ignore
  const catalogDAO = await CatalogDAO.deploy(100, daoStaking.address);
  await catalogDAO.deployed();
  daoStaking.setCatalogDao(catalogDAO.address);

  const FeeDAO = await ethers.getContractFactory("FeeDao");
  const feeDao = await FeeDAO.deploy(
    ric.address,
    daoStaking.address,
    catalogDAO.address,
    10
  );
  const feedao = await feeDao.deployed();

  const RicVault = await ethers.getContractFactory("RicVault");
  const ricVault = await RicVault.deploy(ric.address);
  const ricvault = await ricVault.deployed();

  await feedao.setRicVault(ricvault.address);
  await ricvault.setFeeDao(feedao.address);

  catalogDAO.setTerms("url", "value");
  catalogDAO.connect(owner).accept("value");
  catalogDAO.connect(participant1).accept("value");
  catalogDAO.connect(participant2).accept("value");
  catalogDAO.connect(participant3).accept("value");
  catalogDAO.connect(participant4).accept("value");

  const FEEToken1 = await ethers.getContractFactory("Ric");
  const feeToken1 = await FEEToken1.deploy(ethers.utils.parseEther("10000000"));
  const feetoken1 = await feeToken1.deployed();

  const FEEToken2 = await ethers.getContractFactory("Ric");
  const feeToken2 = await FEEToken2.deploy(ethers.utils.parseEther("10000000"));
  const feetoken2 = await feeToken2.deployed();

  const FEEToken3 = await ethers.getContractFactory("Ric");
  const feeToken3 = await FEEToken3.deploy(ethers.utils.parseEther("10000000"));
  const feetoken3 = await feeToken3.deployed();

  const FEEToken4 = await ethers.getContractFactory("Ric");
  const feeToken4 = await FEEToken4.deploy(ethers.utils.parseEther("10000000"));
  const feetoken4 = await feeToken4.deployed();

  if (withStake) {
    await dropTokens(
      ric,
      owner,
      participant1,
      participant2,
      participant3,
      participant4
    );
    await approveSpend(
      ric,
      daoStaking,
      owner,
      participant1,
      participant2,
      participant3,
      participant4
    );

    await stakeAll(
      daoStaking,
      owner,
      participant1,
      participant2,
      participant3,
      participant4
    );
  }

  return {
    catalogDAO,
    owner,
    participant1,
    participant2,
    participant3,
    participant4,
    participant5,
    ric,
    daoStaking,
    feedao,
    feetoken1,
    feetoken2,
    feetoken3,
    feetoken4,
    ricvault,
    signup,
    ricsale,
    buyer1,
    buyer2,
    buyer3,
    buyer4,
    buyer5,
    buyer6,
    buyer7,
    buyer8,
    buyer9,
    buyer10,
    buyer11,
    buyer12,
    buyer13,
    buyer14,
  };
}

export async function dropTokens(
  ric: Ric,
  owner: SignerWithAddress,
  participant1: SignerWithAddress,
  participant2: SignerWithAddress,
  participant3: SignerWithAddress,
  participant4: SignerWithAddress
) {
  await ric
    .connect(owner)
    .transfer(participant1.address, ethers.utils.parseEther("10000"));
  await ric
    .connect(owner)
    .transfer(participant2.address, ethers.utils.parseEther("10000"));
  await ric
    .connect(owner)
    .transfer(participant3.address, ethers.utils.parseEther("10000"));
  await ric
    .connect(owner)
    .transfer(participant4.address, ethers.utils.parseEther("10000"));
}

export async function approveSpend(
  ric: Ric,
  staking: DaoStaking,
  owner: SignerWithAddress,
  participant1: SignerWithAddress,
  participant2: SignerWithAddress,
  participant3: SignerWithAddress,
  participant4: SignerWithAddress
) {
  await ric
    .connect(owner)
    .approve(staking.address, ethers.utils.parseEther("3000"));
  await ric
    .connect(participant1)
    .approve(staking.address, ethers.utils.parseEther("3000"));
  await ric
    .connect(participant2)
    .approve(staking.address, ethers.utils.parseEther("3000"));
  await ric
    .connect(participant3)
    .approve(staking.address, ethers.utils.parseEther("3000"));
  await ric
    .connect(participant4)
    .approve(staking.address, ethers.utils.parseEther("3000"));
}

export async function stakeAll(
  staking: DaoStaking,
  owner: SignerWithAddress,
  participant1: SignerWithAddress,
  participant2: SignerWithAddress,
  participant3: SignerWithAddress,
  participant4: SignerWithAddress
) {
  await staking.connect(owner).stake();
  await staking.connect(participant1).stake();
  await staking.connect(participant2).stake();
  await staking.connect(participant3).stake();
  await staking.connect(participant4).stake();
}

export async function expectRevert(
  asyncCallback: CallableFunction,
  errString: string
) {
  let throws = false;
  let err = "";
  try {
    await asyncCallback();
  } catch (e: any) {
    throws = true;
    err = e.message;
  }

  if (!throws) {
    throw new Error(`Didn't throw ${errString}`);
  }
  if (!err.includes(errString)) {
    console.warn(err);
    throw new Error(`ErrorCode ${errString} is not in the error`);
  }

  // Check if it throws and if it threw the correct error
  return {
    throws,
    correct: err.includes(errString),
  };
}

export async function mineBlocks(blockNumber: number) {
  console.log(`    ⛏️️`);
  while (blockNumber > 0) {
    blockNumber--;
    await network.provider.request({
      method: "evm_mine",
      params: [],
    });
  }
}

export async function grindForRank(
  catalogDAO: CatalogDao,
  participant: SignerWithAddress,
  owner: SignerWithAddress,
  grindfor: number,
  scID: string
) {
  for (let i = 0; i < grindfor; i++) {
    const tx = await catalogDAO
      .connect(participant)
      .proposeNewSmartContract(scID + i, false, false, false, 0);
    const lastId = await catalogDAO.getSmartContractProposalIndex();

    await tx.wait().then(async () => {
      await catalogDAO
        .connect(owner)
        .voteOnNewSmartContract(lastId, true, false);

      await mineBlocks(100).then(async () => {
        await catalogDAO
          .connect(participant)
          .closeSmartContractProposal(lastId);
      });
    });
  }
}
