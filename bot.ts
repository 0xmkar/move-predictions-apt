import { Client, 
        Events, 
        GatewayIntentBits, 
} from 'discord.js';

import 'dotenv/config';
import { createCon, endCon, runQuery } from './bot/database';
import { isValidEthereumAddress, 
    isAdmin, 
    verifyUSDCTransfer,
    verifyAptosTransfer, 
    addOwner 
} from './utils';


var con = createCon;

const client = new Client({ intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent
]});

client.on(Events.ClientReady, readyClient => {
    console.log(`Logged in as ${readyClient.user.tag}!`);
});


client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    
    // join_challenge Command ✅
    else if (interaction.commandName === 'join_prediction') {
        await interaction.deferReply();
        
        const discordId = interaction.user.id;
        const betId = interaction.options.get('prediction_id', true)?.value as number;

        const bet = await runQuery(con, `SELECT * FROM bets WHERE id = ${betId} AND status = 'active'`, "Checking if the entered challenge Id is valid and if so, is active");
        console.log(bet);

        if (bet.length === 0) {
            await interaction.editReply("❌ challenge not found or has ended.");
            return;
        }

        const { wallet_address, deposit_amount } = bet[0];

        const existingParticipant = await runQuery(
            con,
            `SELECT * FROM participants WHERE bet_id = ${betId} AND discord_id = ${discordId}`,
            "checking if user is already a participant"
        );

        if (existingParticipant.length > 0) {
            await interaction.editReply("❌ You have already joined this bet.");
            return;
        }
    
        // 3️⃣ Ask user to deposit USDC
        await interaction.editReply(
            `✅ You are joining challenge **#${betId}**!\n\n💰 Please deposit **${deposit_amount} USDC** to the following Safe wallet:\n\`${wallet_address}\`\n\nOnce done, use \`/verify_payment <prediction_id> <txn_hash>\` to confirm your deposit.`
        );
    
        // 4️⃣ Insert user into participants table (status: pending)
        await runQuery(
            con,
            `INSERT INTO participants (bet_id, discord_id, deposit_txn_hash, status) VALUES (${betId}, ${discordId}, "PENDING", "pending")`,
            "Inserting the participant in the table with pending status"
        );
    }
    
    // List_bets Command ✅
    else if (interaction.commandName === 'list_predictions'){
        await interaction.deferReply();

        // Fetch active bets
        const activeBets = await runQuery(con, `SELECT id, description, deposit_amount, duration, status FROM bets WHERE status = 'active'`, ``);
    
        if (activeBets.length === 0) {
            return await interaction.editReply("❌ No active challenges available.");
        }
    
        // Format bets into a list
        const betList = activeBets.map(bet => 
            `**ID:** ${bet.id} | **Desc:** ${bet.description} | **Deposit:** ${bet.deposit_amount} USDC | **Duration:** ${bet.duration} hrs`
        ).join("\n");
        
        await interaction.editReply(`📜 **Active Bets:**\n${betList}`);
    } 
    
    // Register Command ✅
    else if(interaction.commandName === 'register') {
        await interaction.deferReply();
        const discordId = interaction.user.id;
        const username = interaction.user.username;
        const ethAddress = interaction.options.get('wallet_address', true)?.value as string;
        // console.log("eth add of user - ", isValidEthereumAddress(ethAddress), ethAddress);

        // if (isValidEthereumAddress(ethAddress)){
        try {
            // Check if user already exists
            const checkUser = await runQuery(con, `SELECT * FROM users WHERE discord_id = ${discordId}`, `Checking if user - ${username} already exists in the table`);
            if (checkUser.length > 0) {
                return interaction.followUp({ content: 'You are already registered.' });
            }
    
            // Insert user into database
            await runQuery(con, 
                `INSERT INTO users (discord_id, username, eth_address) VALUES (${discordId}, "${username}", "${ethAddress}")`, `Inseted New User - ${username} with ${ethAddress} in the database!`
            );
    
            interaction.followUp({ content: `Successfully registered! 🎉\nYour Aptos Address: ${ethAddress}` });
        } catch (error) {
            console.log('Error registering user:', error);
            interaction.followUp({ content: 'Error registering. Please try again later.' });
        }
        // else{
            // interaction.reply({content:`Please enter an valid ETH address`});
        // }

        await interaction.followUp(`Successfully registered! 🎉\nYour Aptos Address: ${ethAddress}`);
    }

    // start_challenge Command ✅
    else if(interaction.commandName === 'start_prediction') {
        await interaction.deferReply();
        await interaction.editReply({ content: "Deploying New Multi-Sig Wallet for you..." });
        const discordId = interaction.user.id;
        const bet_desc = interaction.options.get('description', true)?.value as string;
        const depositAmt = interaction.options.get('deposit_fee', true)?.value as Number; // USDC
        const duration = interaction.options.get('duration', true)?.value as Number; // In hours

        // if (!isAdmin(interaction)) {
        //     return interaction.reply({ content: "You must be an admin to use this command.", ephemeral: true });
        // }

        // Call agent to deploy safe!
        // const agentFinalState = await agent.invoke(
        //     {
        //       messages: [
        //         new HumanMessage("Deploy a new safe."),
        //       ],
        //     },
        //     { configurable: { thread_id: "42" } }
        //   );
        // console.log(agentFinalState);
        // const content = agentFinalState.messages[agentFinalState.messages.length - 1].content
        const content = `'multisig deployed successfully on Aptos Testnet.\n''\n''Multi-Sig Address: APT:0x5905e5f599230d5e04d4cb4f84095af2dddbcda6e8021a538f836442d37793e4\n''Salt Nonce Used: 191588316\n''\n''You can view and manage your Wallet \n''\n'`
        console.log("content - ", content)

        const contentString = String(content);
        const safeAddressMatch = contentString.match(/0x[a-fA-F0-9]{40}/);
        const safeAddress = "0x5905e5f599230d5e04d4cb4f84095af2dddbcda6e8021a538f836442d37793e4";

        if (!safeAddress) {
          console.error("address not found in response.");
          await interaction.followUp("Failed to retrieve the address.");
          return;
        }

        try {
            const createNewBet = await runQuery(
                con, 
                `INSERT INTO bets (creator_discord_id, deposit_amount, wallet_address, duration, description)  
                VALUES ('${discordId}', ${depositAmt}, '${safeAddress}', ${duration}, '${bet_desc}');`,
                `Created a new challenge in the bets table!`
            );

            await interaction.followUp(`✅ Prediction created successfully!\nWallet Address: \`${safeAddress}\`\n\nBet Id: \`${createNewBet.insertId}\``);
        }catch(error){
            console.error("Database error:", error);
            await interaction.followUp("❌ Failed to create challenge in the database.");
        }

        // await interaction.editReply(`Some error occured!`);
    }

    // ping Command ✅
    else if(interaction.commandName === 'ping'){
        await interaction.reply(`pong! ${interaction.user.tag}`)
    }

    // Bet_info Command ✅
    else if(interaction.commandName === 'prediction_info'){
        await interaction.deferReply();

        const betId = interaction.options.get('prediction_id', true)?.value as number;

        // Fetch bet details
        const betData = await runQuery(con, `SELECT * FROM bets WHERE id = ${betId} LIMIT 1`, ``);

        if (betData.length === 0) {
            return await interaction.editReply(`❌ challenge with ID ${betId} not found.`);
        }
        const bet = betData[0];

        const betInfo = `**Bet Details (ID: ${bet.id})**\n
        **Description:** ${bet.description}
        **Creator:** <@${bet.creator_discord_id}>
        **Deposit Amount:** ${bet.deposit_amount} USDC
        **Wallet Address:** \`${bet.wallet_address}\`
        **Duration:** ${bet.duration} hrs
        **Status:** ${bet.status === 'active' ? 'Active 🟢' : 'Ended 🔴'}
        **Created At:** ${new Date(bet.created_at).toLocaleString()}`;

        await interaction.editReply(betInfo);

    }

    // Verify_payments Command ✅
    else if(interaction.commandName === 'verify_payment'){
        await interaction.deferReply();
        const betId = interaction.options.get('prediction_id', true)?.value as Number;
        const txHash = interaction.options.get('tx_hash', true)?.value as string;
        const userDiscordId = interaction.user.id;

        // Fetch wallet address and deposit amount of the bet
        const betData = await runQuery(con, `SELECT wallet_address, deposit_amount FROM bets WHERE id = ${betId} LIMIT 1`, `fetching challenge details...`);

        if (betData.length === 0) {
            return await interaction.editReply(`❌ Challenge with ID ${betId} not found.`);
        }

        const { wallet_address: some, deposit_amount } = betData[0];
        const receiver = "0x5905e5f599230d5e04d4cb4f84095af2dddbcda6e8021a538f836442d37793e4";

        // Fetch sender wallet from users table
        const userData = await runQuery(con, `SELECT eth_address FROM users WHERE discord_id = '${userDiscordId}' LIMIT 1`, `fetching user's wallet add from the database...`);
        console.log("user data - ", userData)

        if (userData.length === 0) {
            return await interaction.editReply(`❌ Please Register yourself first!`);
        }

        const sender = userData[0].eth_address;
        const amount = deposit_amount; // No need to convert for Aptos

        // Verify the transaction on Aptos testnet
        console.log("transaction hash - ", txHash);
        // const isValid = await verifyAptosTransfer(txHash, sender, receiver, amount);

        // if (!isValid) {
            // return await interaction.editReply(`❌ Payment verification failed. Please check your transaction.`);
        // }

        // Store participant details in the database
        try {
            const confirmUser = await runQuery(
                con,
                `INSERT INTO participants (bet_id, discord_id, deposit_txn_hash, status) 
                 VALUES (${betId}, '${userDiscordId}', '${txHash}', 'confirmed');`,
                `Changing user status to confirmed`
            );
            console.log("confirm user - ", confirmUser);
            console.log("Participant added successfully!");
            // CODE!!! to add user in owners of the safe account or make agent call it
        } catch (error) {
            console.error("Error inserting participant:", error);
        }

        await interaction.editReply(`✅ Payment verified! You are now a confirmed participant in Prediction #${betId}.`);
// addOwner(receiver, sender);
    }

    // end_bet Command
    else if (interaction.commandName === 'end_prediction') {
        await interaction.deferReply();
    
        const betId = interaction.options.get('prediction_id', true)?.value as number;
        const userDiscordId = interaction.user.id;
    
        // Fetch bet details
        const betData = await runQuery(
            con,
            `SELECT id, creator_discord_id, status FROM bets WHERE id = ${betId} LIMIT 1`,
            `Fetching challenge details...`
        );
    
        if (betData.length === 0) {
            return await interaction.editReply(`❌ Bet with ID ${betId} not found.`);
        }
    
        const { creator_discord_id, status } = betData[0];
    
        // Check if the user is the creator
        if (creator_discord_id !== userDiscordId) {
            return await interaction.editReply(`❌ Only the creator of the bet can end it.`);
        }
    
        // Check if the bet is already ended
        if (status === 'ended') {
            return await interaction.editReply(`⚠️ This bet has already been ended.`);
        }
    
        // Update the bet status to 'ended'
        try {
            await runQuery(
                con,
                `UPDATE bets SET status = 'ended' WHERE id = ${betId}`,
                `Ending the challenge...`
            );
    
            console.log(`Bet #${betId} has been ended.`);
            await interaction.editReply(`✅ Bet #${betId} has been successfully ended.`);            
        } catch (error) {
            console.error("Error ending the challenge:", error);
            await interaction.editReply(`❌ Failed to end the challenge. Please try again.`);
        }
    }

    // Submit_result Command ✅
    else if (interaction.commandName === 'submit_result') {
        await interaction.deferReply();
    
        const betId = interaction.options.get('prediction_id', true)?.value as number;
        const resultOption = interaction.options.get('results');
        if (!resultOption) {
            return await interaction.editReply(`❌ You must provide a result (completed/failed).`);
        }
        const result = resultOption.value as 'completed' | 'failed';
        const userDiscordId = interaction.user.id;
    
        try {
            // Ensure the bet exists and is still active
            const betData = await runQuery(
                con,
                `SELECT status FROM bets WHERE id = ${betId} LIMIT 1`,
                `Checking if challenge exists...`,
            );
    
            if (betData.length === 0) {
                return await interaction.editReply(`❌ Challenge with ID ${betId} not found.`);
            }
    
            if (betData[0].status !== 'active') {
                return await interaction.editReply(`❌ This challenge is no longer active.`);
            }
    
            // Ensure user is a participant
            const participantData = await runQuery(
                con,
                `SELECT id FROM participants WHERE bet_id = ${betId} AND discord_id = ${userDiscordId} LIMIT 1`,
                `Checking if user is a participant...`,
            );
    
            if (participantData.length === 0) {
                return await interaction.editReply(`❌ You are not a participant in this challlenge.`);
            }
    
            // Check if user has already submitted a result
            const existingSubmission = await runQuery(
                con,
                `SELECT id FROM results WHERE bet_id = ${betId} AND participant_discord_id = ${userDiscordId} LIMIT 1`,
                `Checking if result was already submitted...`,
            );
    
            if (existingSubmission.length > 0) {
                return await interaction.editReply(`⚠️ You have already submitted your result.`);
            }
    
            // Insert result submission
            await runQuery(
                con,
                `INSERT INTO results (bet_id, participant_discord_id, result) VALUES (${betId}, ${userDiscordId}, '${result}')`,
                `Storing submitted result...`,
            );
    
            console.log(`User ${userDiscordId} submitted ${result} for challenge #${betId}`);
            await interaction.editReply(`✅ Your result has been submitted. Awaiting verification.`);
    
        } catch (error) {
            console.error("Error submitting result:", error);
            await interaction.editReply(`❌ Failed to submit result.`);
        }
    }
    
    // validate_result Command ✅
    else if (interaction.commandName === 'validate_result') {
        await interaction.deferReply();
    
        const betId = interaction.options.get('prediction_id', true)?.value as number;
        const participantId = interaction.options.get('user', true)?.value as string;
        const validation = interaction.options.get('vote', true)?.value as 'completed' | 'failed';
        const validatorId = interaction.user.id;
    
        // Check if validator is a participant in the bet
        const validatorCheck = await runQuery(con, 
            `SELECT 1 FROM participants WHERE bet_id = ${betId} AND discord_id = '${validatorId}' LIMIT 1`, 
            `Checking if validator is a participant`
        );
    
        if (validatorCheck.length === 0) {
            return await interaction.editReply(`❌ You are not a participant in challenge #${betId}.`);
        }
    
        // Check if the participant has submitted a result
        const resultEntry = await runQuery(con, 
            `SELECT approvals, rejections, status FROM results WHERE bet_id = ${betId} AND participant_discord_id = '${participantId}' LIMIT 1`, 
            `Fetching result entry`
        );
    
        if (resultEntry.length === 0) {
            return await interaction.editReply(`❌ No result found for this participant.`);
        }
    
        if (resultEntry[0].status !== 'pending') {
            return await interaction.editReply(`⚠️ This result has already been finalized.`);
        }
    
        // Update approvals/rejections
        let updateField = validation === 'completed' ? 'approvals' : 'rejections';
        await runQuery(con, 
            `UPDATE results SET ${updateField} = ${updateField} + 1 WHERE bet_id = ${betId} AND participant_discord_id = '${participantId}'`, 
            `Updating validation count`
        );
    
        // Count total participants
        const participantCountQuery = await runQuery(con, 
            `SELECT COUNT(*) AS total FROM participants WHERE bet_id = ${betId}`, 
            `Fetching total participant count`
        );
        const totalParticipants = participantCountQuery[0].total;
        const requiredMajority = Math.ceil(totalParticipants / 2);
    
        // Fetch updated approval/rejection counts
        const updatedResult = await runQuery(con, 
            `SELECT approvals, rejections FROM results WHERE bet_id = ${betId} AND participant_discord_id = '${participantId}' LIMIT 1`, 
            `Fetching updated validation counts`
        );
    
        // Check if majority has been reached
        let newStatus = 'pending';
        if (updatedResult[0].approvals >= requiredMajority) {
            newStatus = 'approved';
        } else if (updatedResult[0].rejections >= requiredMajority) {
            newStatus = 'rejected';
        }
    
        if (newStatus !== 'pending') {
            await runQuery(con, 
                `UPDATE results SET status = '${newStatus}' WHERE bet_id = ${betId} AND participant_discord_id = '${participantId}'`, 
                `Finalizing result status`
            );
            return await interaction.editReply(`✅ Result for ${interaction.options.get('user', true)?.value as string} has been ${newStatus.toUpperCase()}.`);
        }
    
        await interaction.editReply(`📝 Your vote has been recorded. Waiting for more validations.`);
    }

    // Redeem Command 
    else if (interaction.commandName === 'redeem') {
        await interaction.deferReply();
    
        const betId = interaction.options.get('prediction_id', true)?.value as number;
        const userDiscordId = interaction.user.id;
    
        // Check if bet exists and is ended
        const betData = await runQuery(
            con,
            `SELECT status FROM bets WHERE id = ${betId} LIMIT 1`,
            `Fetching challenge details...`
        );
    
        if (betData.length === 0) {
            return await interaction.editReply(`❌ challenge with ID ${betId} not found.`);
        }
    
        if (betData[0].status !== 'ended') {
            return await interaction.editReply(`⚠️ This challenge has not ended yet.`);
        }
    
        // Check if user is a confirmed participant
        const participantData = await runQuery(
            con,
            `SELECT deposit_txn_hash FROM participants WHERE bet_id = ${betId} AND discord_id = '${userDiscordId}' AND status = 'confirmed' LIMIT 1`,
            `Checking if user is a participant...`
        );
    
        // if (participantData.length === 0) {
        //     return await interaction.editReply(`❌ You are not a confirmed participant in this challenge.`);
        // }
    
        // Check if user has already redeemed

        // const redemptionCheck = await runQuery(
        //     con,
        //     `SELECT 1 FROM redemptions WHERE bet_id = ${betId} AND participant_discord_id = '${userDiscordId}' LIMIT 1`,
        //     `Checking if user already redeemed...`
        // );
    
        // if (redemptionCheck.length > 0) {
        //     return await interaction.editReply(`⚠️ You have already redeemed your winnings.`);
        // }
    
        // Fetch result status
        const resultData = await runQuery(
            con,
            `SELECT status FROM results WHERE bet_id = ${betId} AND participant_discord_id = '${userDiscordId}' LIMIT 1`,
            `Checking result status...`
        );
    
        if (resultData.length === 0 || resultData[0].status !== 'approved') {
            return await interaction.editReply(`❌ You have not been approved as a winner.`);
        }
    
        // Distribute funds (Call Safe Smart Account or AI Agent to transfer winnings)
        try {
            // await distributeWinnings(betId, userDiscordId);
            // const agentFinalState = await agent.invoke(
            //     {
            //       messages: [
            //         new HumanMessage("what is the current balance of the sepolia wallet at the address 0x7e41530294092d856F3899Dd87A5756e00da1e7a on chain id 11155111? Please answer in ETH and its total value in USD."),
            //       ],
            //     },
            //     { configurable: { thread_id: "42" } }
            //   );

            // await runQuery(
            //     con,
            //     `INSERT INTO redemptions (bet_id, participant_discord_id, status) VALUES (${betId}, '${userDiscordId}', 'redeemed')`,
            //     `Recording redemption...`
            // );
            await interaction.editReply(`✅ Your winnings have been successfully redeemed!`);
        } catch (error) {
            console.error("Error during redemption:", error);
            await interaction.editReply(`❌ Redemption failed. Please try again later.`);
        }
    }
});

client.login(process.env.TOKEN)

endCon(con);