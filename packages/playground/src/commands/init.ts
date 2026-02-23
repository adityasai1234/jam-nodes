import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Template for .env file
 */
const ENV_TEMPLATE = `# jam-nodes Playground Configuration
# Add your API keys below

# Apollo.io (Contact Search)
# JAM_APOLLO_API_KEY=your_api_key_here

# Hunter.io (Email Finder)
# JAM_HUNTER_API_KEY=your_api_key_here

# OpenAI (AI Features)
# JAM_OPENAI_API_KEY=your_api_key_here

# Anthropic (AI Features)
# JAM_ANTHROPIC_API_KEY=your_api_key_here

# Twitter/X (Social Monitoring)
# JAM_TWITTER_BEARER_TOKEN=your_bearer_token_here

# Reddit (Social Monitoring)
# JAM_REDDIT_CLIENT_ID=your_client_id_here
# JAM_REDDIT_CLIENT_SECRET=your_client_secret_here

# LinkedIn (Social Monitoring)
# JAM_LINKEDIN_ACCESS_TOKEN=your_access_token_here

# DataForSEO (SEO Tools)
# JAM_DATAFORSEO_LOGIN=your_login_here
# JAM_DATAFORSEO_PASSWORD=your_password_here

# SendGrid (Email Sending)
# JAM_SENDGRID_API_KEY=your_api_key_here

# HubSpot (CRM)
# JAM_HUBSPOT_API_KEY=your_api_key_here

# Clearbit (Enrichment)
# JAM_CLEARBIT_API_KEY=your_api_key_here

# Dropcontact (Enrichment)
# JAM_DROPCONTACT_API_KEY=your_api_key_here
`;

/**
 * Init command - initializes a .env file with template
 */
export const initCommand = new Command('init')
  .description('Initialize a .env file with credential template')
  .option('-f, --force', 'Overwrite existing .env file')
  .option('-p, --path <path>', 'Custom path for .env file', '.env')
  .action((options) => {
    const envPath = path.resolve(process.cwd(), options.path);

    // Check if file exists
    if (fs.existsSync(envPath) && !options.force) {
      console.log(chalk.yellow(`⚠ ${options.path} already exists`));
      console.log(chalk.dim('Use --force to overwrite'));
      return;
    }

    // Write template
    fs.writeFileSync(envPath, ENV_TEMPLATE, 'utf-8');

    console.log(chalk.green(`✓ Created ${options.path}`));
    console.log();
    console.log(chalk.dim('Edit the file to add your API keys.'));
    console.log(chalk.dim('Uncomment and fill in the keys you need.'));
    console.log();
    console.log(chalk.bold('Quick start:'));
    console.log(chalk.dim('1. Open .env in your editor'));
    console.log(chalk.dim('2. Add your API keys'));
    console.log(chalk.dim('3. Run: jam run <node-type>'));
  });
