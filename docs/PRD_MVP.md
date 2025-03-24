# **Requirements Document for on-chain VC fund**

## **1. Introduction**

### **1.1 Purpose**

To create a transparent and efficient VC ecosystem by solving issues like opaque NAV calculations and inefficient deal sourcing. This will be achieved through:

- Instant liquidity via the OVT token.
- real time NAV calculation
- (Deal sourcing automation using a multi-agent setup.) Milestone 2

### **1.2 Objectives**

- **MVP:** Deploy the OVT token (with a mock oracle/portfolio positions and on Runes protocol) with functionalities for issuance (distribution of OVT tokens to the community), buying, selling, and real-time NAV lookup.


## **2. Stakeholders**

- **Founders:** Two co-founders with frontend experience.
- **Partners:**
    - LV Capital: VC firm.
    - BTCStartupLab: Deal sourcing pool.
- **Target Audience:** Bitcoin-native angel adopters (retail)

## **3. Scope**

### **3.1 Inclusions**

- **Token Contracts:**
    - OVT for liquidity and investment.
- **Programs:**
    - NAV calculation based on treasury holdings.
    - Buyback & burn for OVT.
- **Smart Contracts:** Deployed on Bitcoin main layer with Arch’s smart contract tooling.
- **Integration:**
    - Oracle programs for real-time price feeds.
    - Compatibility with testnet environments.

### **3.2 Exclusions**

- Real-market liquidity pools (only mocked/simulated for the prototype).
- CTO involvement; development outsourced.

## **4. Requirements**

### **4.1 Functional Requirements**

#### **MVP**

- Mint OVT tokens.
- Buy and sell OVT on Arch’s testnet.
- Fetch and display real-time NAV.


### **4.2 Non-Functional Requirements**

- Settlement and security on Bitcoin’s main layer.
- High-availability architecture for oracle programs.
- Scalability for handling future portfolio expansions.

### **4.3 Technical Constraints**

- Development dependent on Arch Network mainnet launch.
- Integration with Arch’s smart contract standards.

## **5. Milestones**

|**Milestone**|**Deliverable**|**Timeline**|
|---|---|---|
|MVP|OVT issuance and NAV lookup|6 weeks|

## **6. Assumptions and Dependencies**

- **Assumptions:**
    - Oracle programs will deliver reliable, real-time price feeds.
    - Developers will utilize provided Arch Network documentation.
- **Dependencies:**
    - Arch Network mainnet/testnet stability.
    - Timely delivery by hired developers.

## **7. Acceptance Criteria**

### Overview
#### **MVP Acceptance Tests**

1. **Connect Wallet**:
    - Verify wallet connections via supported extensions (e.g., Xverse).
    - Ensure error messages for unsupported wallets or connection failures.

1. **Buy/Sell OVT**:
    - Test successful purchase of OVT with testnet coins.
    - Confirm wallet balances update correctly post-transaction.

1. **Real-Time NAV Display**:
    - Mock price feeds (portfolio positions) in the oracle and verify NAV updates dynamically.
    - Validate frontend displays correct NAV and token breakdowns.

### Acceptance Tests Details
#### **1. Wallet Connection**

##### **Objective**: Ensure seamless wallet integration.

- **Preconditions**: Wallet extension installed, network configured.
- **Steps**:
    1. Open the app.
    2. Click "Connect Wallet."
    3. Select a supported wallet (e.g., MetaMask, Bitcoin wallet).
    4. Authenticate and confirm connection.
- **Expected Results**:
    - Wallet connects successfully, showing the correct account address.
    - An error is displayed if the wallet is unsupported or not installed.
    - Incorrect network prompts a network-switch dialog.

---

#### **2. Buying OVT Tokens**

##### **Objective**: Validate the OVT purchase flow.

- **Preconditions**: Wallet connected, sufficient BTC balance.
- **Steps**:
    1. Navigate to the "Buy OVT" section.
    2. Enter an amount of OVT to purchase.
    3. Confirm the transaction.
    4. View updated dashboard with new OVT balance.
- **Expected Results**:
    - BTC is deducted, and OVT balance increases.
    - Transaction confirmation is displayed (e.g., "Transaction successful!").
    - Error for insufficient BTC or network issues.

---

#### **3. Selling OVT Tokens**

##### **Objective**: Validate the OVT selling flow.

- **Preconditions**: Wallet connected, sufficient OVT balance.
- **Steps**:
    1. Navigate to the "Sell OVT" section.
    2. Enter an amount of OVT to sell.
    3. Confirm the transaction.
    4. View updated dashboard with increased BTC balance.
- **Expected Results**:
    - OVT is deducted, and BTC balance increases.
    - Transaction confirmation is displayed.
    - Error for insufficient OVT or network issues.

---

#### **4. NAV Calculation and Display**

##### **Objective**: Ensure NAV is calculated and displayed accurately.

- **Preconditions**: Portfolio tokens (e.g., WBTC, WETH, SAFTs) and oracle price feeds set up.
- **Steps**:
    1. Navigate to the "NAV" section.
    2. View NAV diagram showing liquid and illiquid assets.
    3. Drill down into the details of SAFTs or individual token holdings.
- **Expected Results**:
    - NAV is displayed as a breakdown of liquid and illiquid components.
    - SAFTs display correct details (e.g., valuation cap, unlock time).
    - Errors are displayed for misconfigured tokens or missing price feeds.

---


---



#### **9. Error Handling and Edge Cases**

##### **Objective**: Ensure robustness under failure scenarios.

###### **9.1 Wallet Connection Failure**

- **Steps**:
    1. Attempt to connect an unsupported wallet.
    2. Attempt to connect with an incorrect network.
- **Expected Results**:
    - Clear error messages guide the user (e.g., "Unsupported wallet" or "Switch to Bitcoin network").

###### **9.2 Insufficient Funds**

- **Steps**:
    1. Try to buy OVT with insufficient BTC.
    2. Try to sell more OVT than owned.
- **Expected Results**:
    - Transaction is blocked with a relevant error (e.g., "Insufficient funds").

###### **9.3 Oracle or NAV Program Errors**

- **Steps**:
    1. Introduce a mock failure in the oracle feed.
    2. Call NAV calculation with missing price data.
- **Expected Results**:
    - Error is logged, and a fallback value or default message is displayed.

---

## **8. Technical Specifications**

### **8.1 Arch Program Integration**

- Follow guides for writing Arch programs, fungible tokens, and oracle integrations.
- Use Arch RPC methods for transactions and state queries.

### **8.2 Token Details**

- **OVT Token:**
    - Name: OVT Token.
    - Decimals: 18.
    - Initial Supply: 1,000,000 OVT.

### **8.3 NAV Calculation**

- Fetch portfolio token prices (WBTC, WETH, and OTORI tokens) via oracle.
- Aggregate treasury holdings.
- Calculate NAV per OVT token and emit results.

### **8.4 SAFT Handling in NAV Calculation**

#### **Background**

- OTORI may occasionally invest using SAFTs (Simple Agreements for Future Equity) instead of SAFTs or fungible tokens. These represent agreements for future equity in startups and lack a direct, liquid market value until the next funding round.

#### **SAFT Integration in NAV Calculation**

1. **Data Model for SAFTs**:
    
    - **Attributes**:
        - Company Name.
        - Investment Amount (in BTC or USD).
        - Agreed Valuation Cap and Discount Rate.
        - SAFT Terms (e.g., conversion triggers, unlock time).
    - **Storage**: These SAFTs will be represented as structured data on-chain (using inscriptions or as program state variables).
2. **NAV Adjustment**:
    
    - SAFTs will not have dynamic price feeds. Instead:
        - The NAV program will fetch stored SAFT data.
        - Apply a static multiplier or value placeholder (e.g., estimated future value based on the valuation cap).
        - Include the result as part of the total NAV but flag it separately for frontend display.
3. **Special Case Logic**:
    
    - SAFTs will not update automatically between funding rounds unless:
        - Admin provides a new valuation or conversion details.
        - NAV calculation distinguishes between liquid (tokens) and illiquid (SAFTs) portions.

#### **Example Implementation**:

- **SAFT Struct**:

```solidity
struct SAFT {
    string companyName;
    uint256 investmentAmount;
    uint256 valuationCap;
    uint256 discountRate;
    uint256 unlockTime;
    bool converted;
}

```

- **NAV Pseudocode**:

```js
function computeNAV() external view returns (uint256 navPerOVT) {
    uint256 liquidValue = calculateLiquidAssets();
    uint256 illiquidValue = calculateIlliquidAssets(); // Includes SAFTs
    uint256 totalSupply = OVT.totalSupply();

    uint256 totalValue = liquidValue + illiquidValue;
    return totalValue / totalSupply;
}

```
### **8.5 Buyback and Burn**

- Simulate market transactions to buy OVT at NAV price.
- only accessible from the admin dashboard, admin dashboard is accessible only by the registered admin wallets
- Burn purchased OVT tokens to reduce supply.

## **9. Risks and Mitigation**

- **Risk:** Dependency on Arch Network stability.
    - **Mitigation:** Develop and test extensively in a local testnet environment.
- **Risk:** Potential delays in developer deliverables.
    - **Mitigation:** Define clear milestones and track progress weekly.


## **10. Customer Journey**

### **Actors and Personas**

1. **Retail Investor**:
    - Connects wallet, views NAV, and buys OVT.
    - Uses UI for tracking portfolio value and liquidity status.
2. **On Chain VC Firm**:
    - Invests via SAFTs or tokens.
    - Tracks performance and NAV updates.

### **Journey Steps**

1. **Investor Onboarding**:
    - Open DApp and connect wallet.
    - View portfolio and NAV information.
    - Buy OVT using BTC or other testnet assets.
    
1. **NAV Updates**:
    - NAV auto-refreshes based on oracle feeds.
    - SAFT investments displayed under “Illiquid Assets.”
    
1. **Buyback Execution**:
    - Treasury allocates funds for buyback.
    - OVT supply reduces, and NAV adjusts.

### **Expanded User Journeys**

#### **1. First Buy (Retail Investor)**

1. Open app.
2. Connect wallet.
3. Click buy button/card.
4. Enter OVT amount.
5. Confirm purchase.
6. View dashboard.
7. See initial investment, Bitcoin wallet, and portfolio updates.
8. Close app.
9. Reopen app.
10. Connect wallet.
11. See initial investment and updated portfolio.

---

#### **2. Seller Journey**

1. Open app.
2. Connect wallet.
3. Click sell button/card.
4. Enter OVT amount.
5. Confirm sale.
6. View dashboard.
7. See Bitcoin wallet and portfolio updates.
8. Close app.
9. Reopen app.
10. Connect wallet.
11. See updated portfolio and Bitcoin wallet.

---

#### **3. Holder Journey**

1. Open app.
2. Connect wallet.
3. Click NAV button.
4. Click NAV diagram.
5. View token explorer showing OVT holding details.
6. Observe token prices increase.
7. Close token explorer.
8. Navigate back to dashboard.
9. See OVT price increase reflected in portfolio.

---

#### **4. First Timer (Exploring Features)**

1. Open app.
2. Click BBB Event button.
3. Click tooltip for context.
4. Close tooltip.
5. Click NAV button/card.
6. Click NAV diagram.
7. View token explorer showing OVT holding details.

---

#### **5. Advanced Investor (Exploring NAV Breakdown and SAFT Details)**

**Purpose:** Understand portfolio composition and assess SAFT contributions to NAV.

1. Open app.
2. Connect wallet.
3. Navigate to dashboard and click NAV button to open diagram.
4. View breakdown of NAV into liquid (tokens) and illiquid (SAFTs).
5. Click on "Illiquid Assets" section.
6. View SAFT details, including company name, valuation cap, and unlock time.
7. Navigate back to the NAV diagram.
8. Observe the portfolio NAV updates dynamically.
9. Close NAV view and return to the dashboard.

---


#### **8. Error Handling (Unsuccessful Transaction)** 

**Purpose:** Handle scenarios where wallet connections or transactions fail.

1. Open app.
2. Attempt to connect wallet.
3. Receive error message (e.g., "Wallet not supported" or "Network not available").
4. Follow on-screen instructions to troubleshoot (e.g., switch networks or enable permissions).
5. Retry wallet connection.
6. Successfully connect and proceed with the intended action (e.g., buy/sell OVT).

---

## **11. Testing Strategy**

### **Unit Testing**

- Test smart contract functions in isolation:
    - OVT minting, transfer, and burn.
    - NAV computation for edge cases (e.g., zero total supply, SAFT data misconfiguration).

### **Integration Testing**

- Combine frontend and backend:
    - Test wallet integration and DApp API calls.
    - Verify UI reflects contract state accurately.

### **End-to-End Testing**

- Simulate real user flows:
    - Connect wallet → Buy OVT → View NAV.
    - Execute buyback and verify supply reduction.

## **12. References**

- [How to Write an Arch Program](https://docs.arch.network/book/guides/how-to-write-arch-program.html)
- [How to Write an Oracle Program](https://docs.arch.network/book/guides/how-to-write-oracle-program.html)
- [How to Create a Fungible Token](https://docs.arch.network/book/guides/how-to-create-a-fungible-token.html)
- [How to Configure Local Validator Bitcoin Testnet4](https://docs.arch.network/book/guides/how-to-configure-local-validator-bitcoin-testnet4.html)
- [HTTP RPC Methods](https://docs.arch.network/book/rpc/http-methods.html)

---

Would you like any modifications or additional details in this document?