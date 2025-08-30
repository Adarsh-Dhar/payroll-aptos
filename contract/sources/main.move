module escrow::escrow {

    use std::signer;
    use aptos_std::event;
    use aptos_std::table;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::account;

    /// Error codes
    const E_NOT_ADMIN: u64 = 1;
    const E_TASK_EXISTS: u64 = 2;
    const E_TASK_NOT_FOUND: u64 = 3;
    const E_BAD_AMOUNT: u64 = 4;
    const E_NOT_ASSIGNEE: u64 = 5;
    const E_NOT_AVAILABLE: u64 = 6;
    const E_ALREADY_PAID: u64 = 7;

    /// A single task’s lifecycle
    /// 0 = Open, 1 = Completed (awaiting payout), 2 = Paid, 3 = Cancelled (refunded)
    struct Task has copy, drop, store {
        id: u64,
        assignee: address,
        amount: u64,
        state: u8
    }

    /// Project vault and task registry (owned by project admin)
    struct Project has key {
        admin: address,
        vault: coin::Coin<AptosCoin>,
        tasks: table::Table<u64, Task>,
        task_count: u64,
        /// Events
        events: ProjectEvents,
    }

    struct ProjectEvents has key, store {
        funded: event::EventHandle<FundingEvent>,
        task_created: event::EventHandle<TaskCreatedEvent>,
        completed: event::EventHandle<TaskCompletedEvent>,
        paid: event::EventHandle<TaskPaidEvent>,
        refunded: event::EventHandle<TaskRefundedEvent>,
        withdrawn: event::EventHandle<WithdrawEvent>,
    }

    struct FundingEvent has copy, drop, store { amount: u64 }
    struct TaskCreatedEvent has copy, drop, store { id: u64, assignee: address, amount: u64 }
    struct TaskCompletedEvent has copy, drop, store { id: u64 }
    struct TaskPaidEvent has copy, drop, store { id: u64, assignee: address, amount: u64 }
    struct TaskRefundedEvent has copy, drop, store { id: u64, amount: u64 }
    struct WithdrawEvent has copy, drop, store { amount: u64 }

    /// Initialize a project under the admin’s account address. Can be called once.
    public entry fun init_project(admin: &signer) {
        let addr = signer::address_of(admin);
        // Publish empty events if not exists
        if (!exists<ProjectEvents>(addr)) {
            move_to(admin, ProjectEvents {
                funded: account::new_event_handle<FundingEvent>(admin),
                task_created: account::new_event_handle<TaskCreatedEvent>(admin),
                completed: account::new_event_handle<TaskCompletedEvent>(admin),
                paid: account::new_event_handle<TaskPaidEvent>(admin),
                refunded: account::new_event_handle<TaskRefundedEvent>(admin),
                withdrawn: account::new_event_handle<WithdrawEvent>(admin),
            });
        };
        assert!(!exists<Project>(addr), E_NOT_AVAILABLE);
        move_to(admin, Project {
            admin: addr,
            vault: coin::zero<AptosCoin>(),
            tasks: table::new<u64, Task>(),
            task_count: 0,
            events: ProjectEvents {
                funded: account::new_event_handle<FundingEvent>(admin),
                task_created: account::new_event_handle<TaskCreatedEvent>(admin),
                completed: account::new_event_handle<TaskCompletedEvent>(admin),
                paid: account::new_event_handle<TaskPaidEvent>(admin),
                refunded: account::new_event_handle<TaskRefundedEvent>(admin),
                withdrawn: account::new_event_handle<WithdrawEvent>(admin),
            },
        });
    }

    /// Deposit APT budget into the project vault.
    public entry fun fund_project(admin: &signer, amount: u64)
        acquires Project
    {
        only_admin(admin);
        let addr = signer::address_of(admin);
        let p = borrow_global_mut<Project>(addr);
        let pulled = coin::withdraw<AptosCoin>(admin, amount);
        coin::merge(&mut p.vault, pulled);
        event::emit_event(&mut p.events.funded, FundingEvent { amount });
    }

    /// Create a task with fixed-amount payout to `assignee`.
    public entry fun create_task(admin: &signer, id: u64, assignee: address, amount: u64)
        acquires Project
    {
        only_admin(admin);
        assert!(amount > 0, E_BAD_AMOUNT);
        let addr = signer::address_of(admin);
        let p = borrow_global_mut<Project>(addr);
        let exists = table::contains(&p.tasks, id);
        assert!(!exists, E_TASK_EXISTS);

        // Ensure vault has enough to cover this task at creation time
        let vault_bal = coin::value<AptosCoin>(&p.vault);
        assert!(vault_bal >= amount, E_NOT_AVAILABLE);

        let t = Task { id, assignee, amount, state: 0 };
        table::add(&mut p.tasks, id, t);
        p.task_count = p.task_count + 1;
        event::emit_event(&mut p.events.task_created, TaskCreatedEvent { id, assignee, amount });
    }

    /// Admin marks task completed (e.g., after off-chain review).
    public entry fun mark_completed(admin: &signer, id: u64)
        acquires Project
    {
        only_admin(admin);
        let addr = signer::address_of(admin);
        let p = borrow_global_mut<Project>(addr);
        let t = table::borrow_mut(&mut p.tasks, id);
        assert!(t.state == 0, E_NOT_AVAILABLE); // only from Open
        t.state = 1;
        event::emit_event(&mut p.events.completed, TaskCompletedEvent { id });
    }

    /// Payout: transfer from vault to assignee for a completed task.
    public entry fun pay(admin: &signer, id: u64)
        acquires Project
    {
        only_admin(admin);
        let addr = signer::address_of(admin);
        let p = borrow_global_mut<Project>(addr);

        let t = table::borrow_mut(&mut p.tasks, id);
        assert!(t.state == 1, E_NOT_AVAILABLE); // completed, awaiting payout
        let amount = t.amount;

        // Move `amount` out of vault and to assignee
        let payment = coin::extract<AptosCoin>(&mut p.vault, amount);
        coin::deposit<AptosCoin>(t.assignee, payment);
        t.state = 2;

        event::emit_event(&mut p.events.paid, TaskPaidEvent { id, assignee: t.assignee, amount });
    }

    /// Cancel a task (before payment) and free up its reserved budget.
    /// No direct refund occurs here because funds were held in the same vault; cancelling merely unblocks the budget.
    public entry fun cancel(admin: &signer, id: u64)
        acquires Project
    {
        only_admin(admin);
        let addr = signer::address_of(admin);
        let p = borrow_global_mut<Project>(addr);
        let t = table::borrow_mut(&mut p.tasks, id);
        assert!(t.state == 0 || t.state == 1, E_NOT_AVAILABLE);
        assert!(t.state != 2, E_ALREADY_PAID);
        t.state = 3;

        event::emit_event(&mut p.events.refunded, TaskRefundedEvent { id, amount: t.amount });
    }

    /// Withdraw any remaining APT from the project vault back to admin.
    public entry fun withdraw_remaining(admin: &signer, amount: u64)
        acquires Project
    {
        only_admin(admin);
        let addr = signer::address_of(admin);
        let p = borrow_global_mut<Project>(addr);
        let pulled = coin::extract<AptosCoin>(&mut p.vault, amount);
        coin::deposit<AptosCoin>(addr, pulled);
        event::emit_event(&mut p.events.withdrawn, WithdrawEvent { amount });
    }

    /// ——— helpers ———

    fun only_admin(admin: &signer) acquires Project {
        let addr = signer::address_of(admin);
        let p_addr = signer::address_of(admin);
        assert!(exists<Project>(p_addr), E_NOT_AVAILABLE);
        let p = borrow_global<Project>(p_addr);
        assert!(p.admin == addr, E_NOT_ADMIN);
    }


}
