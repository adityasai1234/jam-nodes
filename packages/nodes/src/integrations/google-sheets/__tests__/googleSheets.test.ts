import { googleSheetsAppendNode } from '../googleSheetsAppend.js';
import { googleSheetsClearNode } from '../googleSheetsClear.js';
import { googleSheetsReadNode } from '../googleSheetsRead.js';
import { googleSheetsUpdateNode } from '../googleSheetsUpdate.js';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
  console.log('=== Testing Google Sheets Append ===\n');

  const credentials = {
    googleSheets: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      accessToken: process.env.GOOGLE_ACCESS_TOKEN!,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN!,
      expiresAt: Date.now() + 3600000,
    },
  };

  // Test 1: Append rows
  const appendResult = await googleSheetsAppendNode.executor(
    {
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      values: [['Name', 'Email'], ['Test User', 'test@example.com']],
    },
    { credentials }
  );
  console.log(`✓ Append rows: success=${appendResult.success}`);
  if (appendResult.success) {
    console.log(`  updatedRange=${appendResult.output?.updatedRange}`);
    console.log(`  updatedRows=${appendResult.output?.updatedRows}`);
  } else {
    console.log(`  error=${appendResult.error}`);
  }

  // Test 2: Append - no credentials
  const appendNoCredResult = await googleSheetsAppendNode.executor(
    {
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      values: [['test']],
    },
    { credentials: {} }
  );
  console.log(`✓ Append - no credentials: success=${appendNoCredResult.success}, error="${appendNoCredResult.error}"`);

  console.log('\n=== Testing Google Sheets Read ===\n');

  // Test 3: Read rows
  const readResult = await googleSheetsReadNode.executor(
    {
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
      range: 'Sheet1!A1:Z100',
    },
    { credentials }
  );
  console.log(`✓ Read rows: success=${readResult.success}`);
  if (readResult.success) {
    console.log(`  rowCount=${readResult.output?.rowCount}`);
    console.log(`  first row=${JSON.stringify(readResult.output?.rows[0])}`);
  } else {
    console.log(`  error=${readResult.error}`);
  }

  // Test 4: Read - no credentials
  const readNoCredResult = await googleSheetsReadNode.executor(
    {
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
      range: 'Sheet1!A1:Z100',
    },
    { credentials: {} }
  );
  console.log(`✓ Read - no credentials: success=${readNoCredResult.success}, error="${readNoCredResult.error}"`);

  console.log('\n=== Testing Google Sheets Update ===\n');

  // Test 5: Update row
  const updateResult = await googleSheetsUpdateNode.executor(
    {
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
      rowNumber: 2,
      values: ['Updated User', 'updated@example.com'],
      valueInputOption: 'RAW',
    },
    { credentials }
  );
  console.log(`✓ Update row: success=${updateResult.success}`);
  if (updateResult.success) {
    console.log(`  updatedRange=${updateResult.output?.updatedRange}`);
    console.log(`  updatedRows=${updateResult.output?.updatedRows}`);
  } else {
    console.log(`  error=${updateResult.error}`);
  }

  // Test 6: Update - no credentials
  const updateNoCredResult = await googleSheetsUpdateNode.executor(
    {
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
      rowNumber: 2,
      values: ['test'],
      valueInputOption: 'RAW',
    },
    { credentials: {} }
  );
  console.log(`✓ Update - no credentials: success=${updateNoCredResult.success}, error="${updateNoCredResult.error}"`);

  console.log('\n=== Testing Google Sheets Clear ===\n');

  // Test 7: Clear sheet
  const clearResult = await googleSheetsClearNode.executor(
    {
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
      range: 'Sheet1!A1:Z100',
    },
    { credentials }
  );
  console.log(`✓ Clear sheet: success=${clearResult.success}`);
  if (clearResult.success) {
    console.log(`  clearedRange=${clearResult.output?.clearedRange}`);
  } else {
    console.log(`  error=${clearResult.error}`);
  }

  // Test 8: Clear - no credentials
  const clearNoCredResult = await googleSheetsClearNode.executor(
    {
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
      range: 'Sheet1!A1:Z100',
    },
    { credentials: {} }
  );
  console.log(`✓ Clear - no credentials: success=${clearNoCredResult.success}, error="${clearNoCredResult.error}"`);

  console.log('\n=== Done! ===');
}

test().catch(console.error);