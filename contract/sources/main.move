module fund_withdraw_v2::project_escrow_v3 {
    use std::signer;
    use std::error;
    use std::table::{Self, Table};
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;

    // Error codes
    const E_PROJECT_NOT_FOUND: u64 = 1;
    const E_INSUFFICIENT_BALANCE: u64 = 2;
    const E_UNAUTHORIZED: u64 = 3;
    const E_ESCROW_NOT_INITIALIZED: u64 = 4;
    const E_PROJECT_ALREADY_EXISTS: u64 = 5;
    const E_AUTO_ID_NOT_INITIALIZED: u64 = 6;
    const E_RECIPIENT_NOT_REGISTERED: u64 = 7;

    // Struct to store project escrow information
    struct ProjectEscrow has store {
        balance: u64,
        owner: address,
        project_name: vector<u8>, // Keep for backward compatibility
    }

    // Capability for withdrawing from projects - removed key ability to allow multiple
    struct WithdrawCapability has store {
        project_id: u64,
        owner: address,
    }

    // User's withdraw capabilities stored in a table
    struct UserWithdrawCapabilities has key {
        capabilities: Table<u64, WithdrawCapability>,
    }

    // Main escrow resource to store all projects
    struct EscrowVault has key {
        projects: Table<u64, ProjectEscrow>,
        total_balance: u64, // Track total funds in the contract
        treasury: coin::Coin<AptosCoin>,
    }

    // Separate resource for auto-incrementing project IDs
    struct AutoProjectIdGenerator has key {
        next_project_id: u64,
    }

    // Initialize the escrow vault (called once by the contract deployer)
    public entry fun initialize(account: &signer) {
        let contract_address = @fund_withdraw_v2;
        if (!exists<EscrowVault>(contract_address)) {
            let vault = EscrowVault {
                projects: table::new(),
                total_balance: 0,
                treasury: coin::zero<AptosCoin>(),
            };
            move_to(account, vault);
        };
        
        if (!exists<AutoProjectIdGenerator>(contract_address)) {
            let id_generator = AutoProjectIdGenerator {
                next_project_id: 0,
            };
            move_to(account, id_generator);
        };
        
        if (!coin::is_account_registered<AptosCoin>(contract_address)) {
            // Register the contract to hold AptosCoin
            coin::register<AptosCoin>(account);
        };
    }

    // Create a new project escrow with auto-generated ID (new function)
    public entry fun create_project_escrow_auto(
        account: &signer,
        initial_amount: u64
    ) acquires EscrowVault, AutoProjectIdGenerator, UserWithdrawCapabilities {
        let contract_address = @fund_withdraw_v2;
        
        // Ensure escrow vault is initialized
        assert!(exists<EscrowVault>(contract_address), error::not_found(E_ESCROW_NOT_INITIALIZED));
        assert!(exists<AutoProjectIdGenerator>(contract_address), error::not_found(E_AUTO_ID_NOT_INITIALIZED));
        
        // Get mutable reference to vault and ID generator
        let vault = borrow_global_mut<EscrowVault>(contract_address);
        let id_generator = borrow_global_mut<AutoProjectIdGenerator>(contract_address);
        
        // Get the next available project ID
        let project_id = id_generator.next_project_id;
        
        // Withdraw coins from user and store in treasury
        let coins = coin::withdraw<AptosCoin>(account, initial_amount);
        coin::merge(&mut vault.treasury, coins);
        
        // Create new project escrow with default name
        let project_escrow = ProjectEscrow {
            balance: initial_amount,
            owner: signer::address_of(account),
            project_name: b"Project", // Default name for backward compatibility
        };
        
        // Store the project with auto-generated ID
        table::add(&mut vault.projects, project_id, project_escrow);
        
        // Update total balance
        vault.total_balance = vault.total_balance + initial_amount;
        
        // Increment the next project ID
        id_generator.next_project_id = id_generator.next_project_id + 1;
        
        // Give the owner a withdraw capability
        let withdraw_cap = WithdrawCapability {
            project_id,
            owner: signer::address_of(account),
        };

        // Initialize user capabilities if not exists
        if (!exists<UserWithdrawCapabilities>(signer::address_of(account))) {
            let user_caps = UserWithdrawCapabilities {
                capabilities: table::new(),
            };
            move_to(account, user_caps);
        };

        // Add the capability to user's table
        let user_caps = borrow_global_mut<UserWithdrawCapabilities>(signer::address_of(account));
        table::add(&mut user_caps.capabilities, project_id, withdraw_cap);
    }

    // Create a new project escrow with a specific ID (keep for backward compatibility)
    public entry fun create_project_escrow(
        account: &signer,
        project_id: u64,
        initial_amount: u64,
        project_name: vector<u8>
    ) acquires EscrowVault, UserWithdrawCapabilities {
        let contract_address = @fund_withdraw_v2;
        
        // Ensure escrow vault is initialized
        assert!(exists<EscrowVault>(contract_address), error::not_found(E_ESCROW_NOT_INITIALIZED));
        
        // Get mutable reference to vault
        let vault = borrow_global_mut<EscrowVault>(contract_address);
        
        // Check if project ID already exists
        assert!(!table::contains(&vault.projects, project_id), error::already_exists(E_PROJECT_ALREADY_EXISTS));
        
        // Withdraw coins from user and store in treasury
        let coins = coin::withdraw<AptosCoin>(account, initial_amount);
        coin::merge(&mut vault.treasury, coins);
        
        // Create new project escrow
        let project_escrow = ProjectEscrow {
            balance: initial_amount,
            owner: signer::address_of(account),
            project_name,
        };
        
        // Store the project with specified ID
        table::add(&mut vault.projects, project_id, project_escrow);
        
        // Update total balance
        vault.total_balance = vault.total_balance + initial_amount;
        
        // Give the owner a withdraw capability
        let withdraw_cap = WithdrawCapability {
            project_id,
            owner: signer::address_of(account),
        };

        // Initialize user capabilities if not exists
        if (!exists<UserWithdrawCapabilities>(signer::address_of(account))) {
            let user_caps = UserWithdrawCapabilities {
                capabilities: table::new(),
            };
            move_to(account, user_caps);
        };

        // Add the capability to user's table
        let user_caps = borrow_global_mut<UserWithdrawCapabilities>(signer::address_of(account));
        table::add(&mut user_caps.capabilities, project_id, withdraw_cap);
    }

    // Add more funds to an existing project
    public entry fun fund_project(
        account: &signer,
        project_id: u64,
        amount: u64
    ) acquires EscrowVault {
        let contract_address = @fund_withdraw_v2;
        
        // Ensure escrow vault is initialized
        assert!(exists<EscrowVault>(contract_address), error::not_found(E_ESCROW_NOT_INITIALIZED));
        
        // Get mutable reference to vault
        let vault = borrow_global_mut<EscrowVault>(contract_address);
        
        // Check if project exists
        assert!(table::contains(&vault.projects, project_id), error::not_found(E_PROJECT_NOT_FOUND));
        
        // Get mutable reference to the project escrow
        let project_escrow = table::borrow_mut(&mut vault.projects, project_id);
        
        // Check if the caller is the owner
        assert!(project_escrow.owner == signer::address_of(account), error::permission_denied(E_UNAUTHORIZED));
        
        // Withdraw coins from user and store in treasury
        let coins = coin::withdraw<AptosCoin>(account, amount);
        coin::merge(&mut vault.treasury, coins);
        
        // Update project balance
        project_escrow.balance = project_escrow.balance + amount;
        
        // Update total balance
        vault.total_balance = vault.total_balance + amount;
    }

   public entry fun withdraw_from_project(
    account: &signer,
    project_id: u64,
    amount: u64
) acquires EscrowVault {
    let contract_address = @fund_withdraw_v2;

    assert!(exists<EscrowVault>(contract_address), error::not_found(E_ESCROW_NOT_INITIALIZED));
    let vault = borrow_global_mut<EscrowVault>(contract_address);

    assert!(table::contains(&vault.projects, project_id), error::not_found(E_PROJECT_NOT_FOUND));
    let project_escrow = table::borrow_mut(&mut vault.projects, project_id);

    assert!(project_escrow.owner == signer::address_of(account), error::permission_denied(E_UNAUTHORIZED));
    assert!(project_escrow.balance >= amount, error::invalid_argument(E_INSUFFICIENT_BALANCE));

    // Update internal accounting first
    project_escrow.balance = project_escrow.balance - amount;
    vault.total_balance = vault.total_balance - amount;

    // Move actual coins from the contract CoinStore to the caller
    let recipient = signer::address_of(account);
    assert!(coin::is_account_registered<AptosCoin>(recipient), error::invalid_argument(E_RECIPIENT_NOT_REGISTERED));

    let coins = coin::extract<AptosCoin>(&mut vault.treasury, amount);
    coin::deposit(recipient, coins);
}

    // View function: get project balance by ID
    #[view]
    public fun get_project_balance(project_id: u64): u64 acquires EscrowVault {
        let contract_address = @fund_withdraw_v2;
        assert!(exists<EscrowVault>(contract_address), error::not_found(E_ESCROW_NOT_INITIALIZED));
        
        let vault = borrow_global<EscrowVault>(contract_address);
        
        if (table::contains(&vault.projects, project_id)) {
            let project_escrow = table::borrow(&vault.projects, project_id);
            project_escrow.balance
        } else {
            0
        }
    }

    // View function: get project owner by ID
    #[view]
    public fun get_project_owner(contract_address: address, project_id: u64): address acquires EscrowVault {
        assert!(exists<EscrowVault>(contract_address), error::not_found(E_ESCROW_NOT_INITIALIZED));
        
        let vault = borrow_global<EscrowVault>(contract_address);
        assert!(table::contains(&vault.projects, project_id), error::not_found(E_PROJECT_NOT_FOUND));
        
        let project_escrow = table::borrow(&vault.projects, project_id);
        project_escrow.owner
    }

    // View function: get project name by ID (keep for backward compatibility)
    #[view]
    public fun get_project_name(contract_address: address, project_id: u64): vector<u8> acquires EscrowVault {
        assert!(exists<EscrowVault>(contract_address), error::not_found(E_ESCROW_NOT_INITIALIZED));
        
        let vault = borrow_global<EscrowVault>(contract_address);
        assert!(table::contains(&vault.projects, project_id), error::not_found(E_PROJECT_NOT_FOUND));
        
        let project_escrow = table::borrow(&vault.projects, project_id);
        project_escrow.project_name
    }

    // View function: check if project exists
    #[view]
    public fun project_exists(contract_address: address, project_id: u64): bool acquires EscrowVault {
        if (!exists<EscrowVault>(contract_address)) {
            return false
        };
        
        let vault = borrow_global<EscrowVault>(contract_address);
        table::contains(&vault.projects, project_id)
    }

    // View function: get total balance in contract
    #[view]
    public fun get_total_balance(contract_address: address): u64 acquires EscrowVault {
        assert!(exists<EscrowVault>(contract_address), error::not_found(E_ESCROW_NOT_INITIALIZED));
        
        let vault = borrow_global<EscrowVault>(contract_address);
        vault.total_balance
    }

    // View function: get next available project ID
    #[view]
    public fun get_next_project_id(contract_address: address): u64 acquires AutoProjectIdGenerator {
        assert!(exists<AutoProjectIdGenerator>(contract_address), error::not_found(E_AUTO_ID_NOT_INITIALIZED));
        
        let id_generator = borrow_global<AutoProjectIdGenerator>(contract_address);
        id_generator.next_project_id
    }

    // View function: get total number of projects
    #[view]
    public fun get_total_projects(contract_address: address): u64 acquires AutoProjectIdGenerator {
        assert!(exists<AutoProjectIdGenerator>(contract_address), error::not_found(E_AUTO_ID_NOT_INITIALIZED));
        
        let id_generator = borrow_global<AutoProjectIdGenerator>(contract_address);
        id_generator.next_project_id
    }

    // Test functions
    #[test_only]
    use aptos_framework::coin::Self;
    #[test_only]
    use aptos_framework::aptos_coin;

    #[test(admin = @0x1, user1 = @0x2, user2 = @0x3)]
    public entry fun test_project_escrow(admin: signer, user1: signer, user2: signer) acquires EscrowVault, AutoProjectIdGenerator {
        // Initialize AptosCoin for testing
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(&admin);
        
        // Register coin stores
        coin::register<AptosCoin>(&user1);
        coin::register<AptosCoin>(&user2);
        
        // Initialize escrow vault
        initialize(&admin);
        
        // Test auto-generated ID function
        create_project_escrow_auto(&user1, 100);
        
        // Check project details
        assert!(get_project_balance(0) == 100, 1);
        assert!(get_project_owner(@fund_withdraw_v2, 0) == signer::address_of(&user1), 2);
        assert!(project_exists(@fund_withdraw_v2, 0) == true, 3);
        assert!(get_total_balance(@fund_withdraw_v2) == 100, 4);
        assert!(get_next_project_id(@fund_withdraw_v2) == 1, 5);
        
        // Test backward compatibility function
        create_project_escrow(&user1, 101, 50, b"Test Project");
        
        // Check second project details
        assert!(get_project_balance(101) == 50, 6);
        assert!(get_total_balance(@fund_withdraw_v2) == 150, 7);
        
        // Fund the first project with more money
        let coins2 = coin::mint<AptosCoin>(25, &mint_cap);
        coin::deposit(signer::address_of(&user1), coins2);
        fund_project(&user1, 0, 25);
        
        // Check updated balance
        assert!(get_project_balance(0) == 125, 8);
        assert!(get_total_balance(@fund_withdraw_v2) == 175, 9);
        
        // Withdraw from first project
        withdraw_from_project(&user1, 0, 75);
        
        // Check final balance
        assert!(get_project_balance(0) == 50, 10);
        assert!(get_total_balance(@fund_withdraw_v2) == 125, 11);
        
        // Clean up
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }
}