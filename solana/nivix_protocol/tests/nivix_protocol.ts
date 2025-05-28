import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NivixProtocol } from "../target/types/nivix_protocol";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo } from "@solana/spl-token";
import { expect } from "chai";

describe("nivix_protocol", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.NivixProtocol as Program<NivixProtocol>;

  // Generate keypairs for testing
  const authority = Keypair.generate();
  const sender = Keypair.generate();
  const recipient = Keypair.generate();
  
  // Token mint and accounts
  let mint: PublicKey;
  let senderTokenAccount: PublicKey;
  let recipientTokenAccount: PublicKey;
  let poolTokenAccount: PublicKey;
  
  // Pool and transaction accounts
  const poolKeypair = Keypair.generate();
  const liquidityRecordKeypair = Keypair.generate();
  const paymentRecordKeypair = Keypair.generate();
  const offlineTxKeypair = Keypair.generate();
  
  before(async () => {
    // Airdrop SOL to the authority and sender
    await provider.connection.requestAirdrop(authority.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(sender.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    
    // Create token mint
    mint = await createMint(
      provider.connection,
      authority,
      authority.publicKey,
      null,
      6 // 6 decimals
    );
    
    // Create token accounts
    senderTokenAccount = await createAccount(
      provider.connection,
      sender,
      mint,
      sender.publicKey
    );
    
    recipientTokenAccount = await createAccount(
      provider.connection,
      sender, // Paying for the creation
      mint,
      recipient.publicKey
    );
    
    poolTokenAccount = await createAccount(
      provider.connection,
      authority,
      mint,
      authority.publicKey
    );
    
    // Mint tokens to sender and authority for testing
    await mintTo(
      provider.connection,
      sender,
      mint,
      senderTokenAccount,
      authority,
      1000000000 // 1000 tokens with 6 decimals
    );
    
    await mintTo(
      provider.connection,
      authority,
      mint,
      poolTokenAccount,
      authority,
      1000000000 // 1000 tokens with 6 decimals
    );
  });

  it("Initializes a liquidity pool", async () => {
    await program.methods
      .initializePool("Main Pool")
      .accounts({
        pool: poolKeypair.publicKey,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([poolKeypair, authority])
      .rpc();
    
    // Fetch the pool data and verify
    const pool = await program.account.liquidityPool.fetch(poolKeypair.publicKey);
    expect(pool.name).to.equal("Main Pool");
    expect(pool.totalLiquidity.toNumber()).to.equal(0);
    expect(pool.authority.toString()).to.equal(authority.publicKey.toString());
  });

  it("Adds liquidity to the pool", async () => {
    await program.methods
      .addLiquidity(new anchor.BN(100000000)) // 100 tokens
      .accounts({
        pool: poolKeypair.publicKey,
        poolTokenAccount: poolTokenAccount,
        providerTokenAccount: senderTokenAccount,
        provider: sender.publicKey,
        liquidityRecord: liquidityRecordKeypair.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([liquidityRecordKeypair, sender])
      .rpc();
    
    // Verify pool state
    const pool = await program.account.liquidityPool.fetch(poolKeypair.publicKey);
    expect(pool.totalLiquidity.toNumber()).to.equal(100000000);
    
    // Verify liquidity record
    const record = await program.account.liquidityRecord.fetch(liquidityRecordKeypair.publicKey);
    expect(record.amount.toNumber()).to.equal(100000000);
    expect(record.provider.toString()).to.equal(sender.publicKey.toString());
    expect(record.pool.toString()).to.equal(poolKeypair.publicKey.toString());
  });

  it("Processes a payment", async () => {
    const recipientId = "user123@nivix.com";
    
    await program.methods
      .processPayment(new anchor.BN(50000000), recipientId, null) // 50 tokens
      .accounts({
        senderTokenAccount: senderTokenAccount,
        recipientTokenAccount: recipientTokenAccount,
        sender: sender.publicKey,
        recipient: recipient.publicKey,
        paymentRecord: paymentRecordKeypair.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([paymentRecordKeypair, sender])
      .rpc();
    
    // Verify payment record
    const record = await program.account.paymentRecord.fetch(paymentRecordKeypair.publicKey);
    expect(record.amount.toNumber()).to.equal(50000000);
    expect(record.sender.toString()).to.equal(sender.publicKey.toString());
    expect(record.recipient.toString()).to.equal(recipient.publicKey.toString());
    expect(record.recipientId).to.equal(recipientId);
  });

  it("Registers an offline transaction", async () => {
    const recipientId = "offline-user@nivix.com";
    const offlineId = "offline-tx-12345";
    
    await program.methods
      .registerOfflineTransaction(
        new anchor.BN(25000000), // 25 tokens
        recipientId,
        offlineId
      )
      .accounts({
        sender: sender.publicKey,
        offlineTransaction: offlineTxKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([offlineTxKeypair, sender])
      .rpc();
    
    // Verify offline transaction record
    const record = await program.account.offlineTransaction.fetch(offlineTxKeypair.publicKey);
    expect(record.amount.toNumber()).to.equal(25000000);
    expect(record.sender.toString()).to.equal(sender.publicKey.toString());
    expect(record.recipientId).to.equal(recipientId);
    expect(record.offlineId).to.equal(offlineId);
    expect(record.status).to.deep.equal({ pending: {} });
  });
});
