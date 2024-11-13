import { expect } from "chai";
import hre from "hardhat";
import { GybernatyUnitManager } from "../typechain-types";

type User = {
  userAddress: string;
  markedUp: boolean;
  markedDown: boolean;
  level: bigint;
};

type DeployOptions = {
  admins?: string[];
  managers?: string[];
};

describe("UnitManager", function () {
  async function userEq(manager: GybernatyUnitManager, target: User) {
    const source = await manager.users(target.userAddress);

    expect(source.markedUp).to.equal(target.markedUp);
    expect(source.userAddress).to.equal(target.userAddress);
    expect(source.markedDown).to.equal(target.markedDown);
    expect(source.level).to.equal(target.level);
  }

  async function deploy(
    options?: DeployOptions
  ): Promise<GybernatyUnitManager> {
    const UnitManager = await hre.ethers.getContractFactory(
      "GybernatyUnitManager"
    );

    const { admins, managers } = options || {};

    return UnitManager.deploy(admins || [], managers || []);
  }

  describe("fail", () => {
    describe("mark", () => {
      describe("up", () => {
        it("MaxLevel", async () => {
          const [owner, otherAccount] = await hre.ethers.getSigners();

          const unitManager = await deploy({
            admins: [owner.address],
            managers: [owner.address],
          });

          await expect(unitManager.createUser(otherAccount, 4)).not.to.be
            .reverted;

          await expect(
            unitManager.connect(otherAccount).userMarkUp()
          ).revertedWithCustomError(unitManager, "MaxLevel");
        });
      });
      describe("down", () => {
        it("MinLevel", async () => {
          const [owner, otherAccount] = await hre.ethers.getSigners();

          const unitManager = await deploy({
            admins: [owner.address],
            managers: [owner.address],
          });

          await expect(unitManager.createUser(otherAccount, 1)).not.to.be
            .reverted;

          await expect(
            unitManager.userMarkDown(otherAccount)
          ).revertedWithCustomError(unitManager, "MinLevel");
        });
        it("OnlyManager", async () => {
          const unitManager = await deploy();

          const [_, otherAccount] = await hre.ethers.getSigners();

          await expect(
            unitManager.userMarkDown(otherAccount.address)
          ).revertedWithCustomError(unitManager, "OnlyManager");
        });

        it("UserNotFound", async () => {
          const [owner, otherAccount] = await hre.ethers.getSigners();

          const unitManager = await deploy({
            managers: [owner.address],
          });

          await expect(
            unitManager.userMarkDown(otherAccount.address)
          ).revertedWithCustomError(unitManager, "UserNotFound");
        });
      });
    });

    describe("make", () => {
      describe("up", () => {
        it("OnlyAdmin", async () => {
          const unitManager = await deploy();

          const [_, otherAccount] = await hre.ethers.getSigners();

          await expect(
            unitManager.userLevelUp(otherAccount.address)
          ).revertedWithCustomError(unitManager, "OnlyAdmin");
        });

        it("UserNotFound", async () => {
          const [owner, otherAccount] = await hre.ethers.getSigners();

          const unitManager = await deploy({
            admins: [owner.address],
          });

          await expect(
            unitManager.userLevelUp(otherAccount.address)
          ).revertedWithCustomError(unitManager, "UserNotFound");
        });

        it("UserNotMarked", async () => {
          const [owner, otherAccount] = await hre.ethers.getSigners();

          const unitManager = await deploy({
            admins: [owner.address],
            managers: [owner.address],
          });

          await expect(unitManager.createUser(otherAccount, 1)).not.to.be
            .reverted;

          await expect(
            unitManager.userLevelUp(otherAccount.address)
          ).revertedWithCustomError(unitManager, "UserNotMarked");
        });
      });

      describe("down", () => {
        it("OnlyAdmin", async () => {
          const unitManager = await deploy();

          const [_, otherAccount] = await hre.ethers.getSigners();

          await expect(
            unitManager.userLevelDown(otherAccount.address)
          ).revertedWithCustomError(unitManager, "OnlyAdmin");
        });

        it("UserNotFound", async () => {
          const [owner, otherAccount] = await hre.ethers.getSigners();

          const unitManager = await deploy({
            admins: [owner.address],
          });

          await expect(
            unitManager.userLevelUp(otherAccount.address)
          ).revertedWithCustomError(unitManager, "UserNotFound");
        });

        it("UserNotMarked", async () => {
          const [owner, otherAccount] = await hre.ethers.getSigners();

          const unitManager = await deploy({
            admins: [owner.address],
            managers: [owner.address],
          });

          await expect(unitManager.createUser(otherAccount, 1)).not.to.be
            .reverted;

          await expect(
            unitManager.userLevelDown(otherAccount.address)
          ).revertedWithCustomError(unitManager, "UserNotMarked");
        });
      });
    });
  });

  it("level up", async function () {
    const [owner, otherAccount] = await hre.ethers.getSigners();

    const unitManager = await deploy({
      admins: [owner.address],
    });

    await expect(unitManager.connect(otherAccount).userMarkUp())
      .to.emit(unitManager, "UserMarkUp")
      .withArgs(otherAccount.address);

    await userEq(unitManager, {
      userAddress: otherAccount.address,
      markedUp: true,
      markedDown: false,
      level: 0n,
    });

    await expect(unitManager.userLevelUp(otherAccount.address))
      .to.emit(unitManager, "UserLevelUp")
      .withArgs(otherAccount.address);

    await userEq(unitManager, {
      userAddress: otherAccount.address,
      markedUp: false,
      markedDown: false,
      level: 1n,
    });
  });

  it("level down", async function () {
    const [owner, otherAccount] = await hre.ethers.getSigners();

    const unitManager = await deploy({
      admins: [owner.address],
      managers: [owner.address],
    });

    await expect(unitManager.createUser(otherAccount.address, 2))
      .to.emit(unitManager, "UserLevelUp")
      .withArgs(otherAccount.address);

    await userEq(unitManager, {
      userAddress: otherAccount.address,
      markedUp: false,
      markedDown: false,
      level: 2n,
    });

    await expect(unitManager.connect(owner).userMarkDown(otherAccount))
      .to.emit(unitManager, "UserMarkDown")
      .withArgs(otherAccount.address);

    await userEq(unitManager, {
      userAddress: otherAccount.address,
      markedUp: false,
      markedDown: true,
      level: 2n,
    });

    await expect(unitManager.userLevelDown(otherAccount.address))
      .to.emit(unitManager, "UserLevelDown")
      .withArgs(otherAccount.address);

    await userEq(unitManager, {
      userAddress: otherAccount.address,
      markedUp: false,
      markedDown: false,
      level: 1n,
    });
  });
});
