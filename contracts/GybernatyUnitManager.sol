// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

contract GybernatyUnitManager {
    struct User {
        address userAddress;
        bool markedUp;
        bool markedDown;
        uint32 level;
    }

    uint32 public constant maxLevel = 4;

    address private owner;
    mapping (address => bool) public admins;
    mapping (address => bool) public managers;
    mapping (address => User) public users;

    event UserMarkUp(address userAddress);
    event UserMarkDown(address userAddress);
    event UserLevelUp(address userAddress);
    event UserLevelDown(address userAddress);

    error OnlyOwner();
    error OnlyAdmin();
    error OnlyManager();
    error LevelInvalid();
    error UserExists();
    error UserNotFound();
    error UserNotMarked();
    error MinLevel();
    error MaxLevel();
    error NoAccess();

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert OnlyOwner();
        }
        _;
    }

    modifier onlyAdmin() {
        if (!admins[msg.sender]) {
            revert OnlyAdmin();
        }
        _;
    }

    modifier onlyManager() {
        if (!managers[msg.sender]) {
            revert OnlyManager();
        }

        _;
    }

    constructor(address[] memory _admins, address[] memory _managers) {
        owner = msg.sender;

        for (uint256 i=0; i<_admins.length; i++) {
            admins[_admins[i]] = true;
        }

        for (uint256 i=0; i<_managers.length; i++) {
            managers[_managers[i]] = true;
        }
    }


    /**
     * Create a new user
     * @param userAddress - user address
     * @param level - initial user level
     */
    function createUser(address userAddress, uint32 level) public onlyAdmin {
        if (users[userAddress].userAddress != address(0)) {
            revert UserExists();
        }

        if (level < 1 || level > maxLevel) {
            revert LevelInvalid();
        }

        User memory user = User(
            userAddress,
            false,
            false,
            level
        );

        users[userAddress] = user;

        emit UserLevelUp(userAddress);
    }

    /**
     * Mark yourself for level up
     */
    function userMarkUp() public {
        address userAddress = msg.sender;

        if (users[userAddress].userAddress == address(0)) {
            User memory user = User(
                userAddress,
                true,
                false,
                0
            );

            users[userAddress] = user;

            emit UserMarkUp(userAddress);

            return;
        }

        if (users[userAddress].level == maxLevel) {
            revert MaxLevel();
        }

        users[userAddress].markedUp = true;

        emit UserMarkUp(userAddress);
    }

    /**
     * Mark user for level down
     * @param userAddress - user to mark level down
     */
    function userMarkDown(address userAddress) public onlyManager {
        if (users[userAddress].userAddress == address(0)) {
            revert UserNotFound();
        }

        if (users[userAddress].level == 1) {
            revert MinLevel();
        }

        users[userAddress].markedDown = true;

        emit UserMarkDown(userAddress);
    }

    /**
     * Up user level
     * @param userAddress - user to level up
     */
    function userLevelUp(address userAddress) public onlyAdmin {
        if (users[userAddress].userAddress == address(0)) {
            revert UserNotFound();
        }

        if (!users[userAddress].markedUp) {
            revert UserNotMarked();
        }

        users[userAddress].level += 1;
        users[userAddress].markedUp = false;
        users[userAddress].markedDown = false;

        emit UserLevelUp(userAddress);
    }

    /**
     * Down user level
     * @param userAddress - user to level down
     */
    function userLevelDown(address userAddress) public onlyAdmin {
        if (users[userAddress].userAddress == address(0)) {
            revert UserNotFound();
        }

        if (users[userAddress].markedDown == false) {
            revert UserNotMarked();
        }

        users[userAddress].level -= 1;
        users[userAddress].markedUp = false;
        users[userAddress].markedDown = false;

        emit UserLevelDown(userAddress);
    }
}
