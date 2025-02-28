import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();


const commands = [
  new SlashCommandBuilder()
  .setName('register')
  .setDescription('Register your Aptos wallet with the bot!')
  .addStringOption(option =>
      option.setName('wallet_address')
          .setDescription('Enter your wallet address')
          .setRequired(true)
  )
  .toJSON(),
  new SlashCommandBuilder()
  .setName('start_prediction')
  .setDescription('Start a new prediction')
  .addStringOption(option =>
      option.setName('description')
          .setDescription('Describe the prediction')
          .setRequired(true)
  )
  .addNumberOption(option =>
      option.setName('deposit_fee')
          .setDescription('Deposit fee in USDC')
          .setRequired(true)
  )
  .addIntegerOption(option =>
      option.setName('duration')
          .setDescription('Duration of the prediction in hours')
          .setRequired(true)
  )
  .toJSON(),
  new SlashCommandBuilder()
    .setName('join_prediction')
    .setDescription('Join an active prediction')
    .addStringOption(option =>
        option.setName('prediction_id')
            .setDescription('The ID of the prediction')
            .setRequired(true)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('verify_payment')
    .setDescription('Verify your deposit transaction')
    .addStringOption(option =>
        option.setName('prediction_id')
            .setDescription('The ID of the prediction')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('tx_hash')
            .setDescription('Your transaction hash')
            .setRequired(true)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('submit_result')
    .setDescription('Submit proof of prediction completion')
    .addStringOption(option =>
        option.setName('prediction_id')
            .setDescription('The ID of the challenge')
            .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('proof')
        .setDescription('completed/failed')
        .setRequired(true)
        .addChoices(
            { name: 'completed', value: 'completed' },
            { name: 'failed', value: 'failed' }
        )
    )
    .toJSON(),
  // new SlashCommandBuilder()
  //   .setName('validate_result')
  //   .setDescription('Vote on a participant’s result submission')
  //   .addStringOption(option =>
  //       option.setName('prediction_id')
  //           .setDescription('The ID of the challenge')
  //           .setRequired(true)
  //   )
  //   .addUserOption(option =>
  //       option.setName('user')
  //           .setDescription('The user whose result is being verified')
  //           .setRequired(true)
  //   )
  //   .addStringOption(option =>
  //       option.setName('vote')
  //           .setDescription('completed/failed')
  //           .setRequired(true)
  //           .addChoices(
  //               { name: 'completed', value: 'completed' },
  //               { name: 'failed', value: 'failed' }
  //           )
  //   )
  //   .toJSON(),
  new SlashCommandBuilder()
    .setName('redeem')
    .setDescription('Redeem winnings from a completed prediction')
    .addStringOption(option =>
        option.setName('prediction_id')
            .setDescription('The ID of the prediction')
            .setRequired(true)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('list_predictions')
    .setDescription('List all active predictions')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('prediction_info')
    .setDescription('Get details of a specific preiction')
    .addStringOption(option =>
        option.setName('prediction_id')
            .setDescription('The ID of the prediction')
            .setRequired(true)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('end_prediction')
    .setDescription('End a prediction and start payout process')
    .addStringOption(option =>
        option.setName('prediction_id')
            .setDescription('The ID of the challenge')
            .setRequired(true)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Says Pong')
];

(async () => {
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN!);

  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID!), { body: commands });
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
})();
