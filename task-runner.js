import GoLogin from '../src/gologin.js';
import { chromium } from 'playwright';
import Logger from './utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { config, validateConfig } from './config.js';

// Import action classes
import LikeAction from './actions/like-action.js';
import RetweetAction from './actions/retweet-action.js';
import FollowAction from './actions/follow-action.js';
import TweetAction from './actions/tweet-action.js';
import QuoteAction from './actions/quote-action.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TaskRunner {
    constructor() {
        this.logger = new Logger();
        // Validate config first
        validateConfig();
        this.gologin = new GoLogin({ token: config.gologin.token });
        this.tasksFile = path.join(__dirname, 'tasks.json');
        this.results = [];
    }

    async loadTasks() {
        try {
            const tasksData = await fs.readFile(this.tasksFile, 'utf8');
            return JSON.parse(tasksData);
        } catch (error) {
            this.logger.error('Failed to load tasks.json:', error.message);
            throw error;
        }
    }

    async fetchProfiles() {
        try {
            this.logger.info('Fetching profiles from GoLogin API...');
            
            // Use direct HTTP request instead of SDK method
            const response = await fetch('https://api.gologin.com/browser/v2', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${config.gologin.token}`,
                    'User-Agent': 'gologin-nodejs-sdk'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const profilesResponse = await response.json();
            
            // Handle different response formats
            let profiles;
            if (Array.isArray(profilesResponse)) {
                profiles = profilesResponse;
            } else if (profilesResponse && typeof profilesResponse === 'object') {
                // Check if it's wrapped in a data property
                profiles = profilesResponse.data || profilesResponse.profiles || profilesResponse;
            } else {
                throw new Error('Invalid response format from GoLogin API');
            }

            if (!profiles || !Array.isArray(profiles)) {
                throw new Error('No profiles found in API response');
            }

            this.logger.info(`Found ${profiles.length} profiles`);
            return profiles;
        } catch (error) {
            this.logger.error('Failed to fetch profiles:', error.message);
            
            // Provide more specific error messages
            if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                throw new Error('Invalid API token. Please check your GOLOGIN_API_TOKEN.');
            } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
                throw new Error('API access denied. Please check your subscription status.');
            } else if (error.message.includes('rate limit') || error.message.includes('429')) {
                throw new Error('API rate limit exceeded. Please wait a few minutes and try again.');
            } else {
                throw new Error(`GoLogin API error: ${error.message}`);
            }
        }
    }

    async launchProfile(profileId) {
        try {
            this.logger.info(`Launching profile: ${profileId}`);
            
            // Set the profile ID
            await this.gologin.setProfileId(profileId);
            
            // Start the browser
            const { wsUrl } = await this.gologin.start();

            const browser = await chromium.connectOverCDP(wsUrl);
            const context = browser.contexts()[0];

            if (!context) {
                throw new Error('No default context found in GoLogin browser');
            }

            const page = await context.newPage();
            
            // Add human-like behavior
            await page.setViewportSize({ width: 1280, height: 720 });
            
            // Random mouse movements and scrolling
            await this.addHumanBehavior(page);

            return { browser, context, page };
        } catch (error) {
            this.logger.error(`Failed to launch profile ${profileId}:`, error.message);
            throw error;
        }
    }

    async addHumanBehavior(page) {
        // Random mouse movements
        await page.mouse.move(Math.random() * 500, Math.random() * 300);
        await this.delay(0.5, 1);
        
        // Random scrolling
        await page.mouse.wheel(0, Math.random() * 100 - 50);
        await this.delay(0.5, 1);
    }

    async verifyTwitterLogin(page) {
        try {
            this.logger.info('Verifying Twitter login...');
            
            await page.goto('https://twitter.com/home');
            await this.delay(3, 5);

            // Check for login indicators
            const loginIndicators = [
                '[data-testid="SideNav_AccountSwitcher_Button"]',
                '[data-testid="AppTabBar_Home_Link"]',
                'div[aria-label*="Account"]',
                'div[data-testid="primaryColumn"]'
            ];

            let isLoggedIn = false;
            for (const selector of loginIndicators) {
                try {
                    await page.waitForSelector(selector, { timeout: 5000 });
                    isLoggedIn = true;
                    break;
                } catch (e) {
                    continue;
                }
            }

            if (!isLoggedIn) {
                // Check if we're redirected to login page
                const currentUrl = page.url();
                if (currentUrl.includes('login') || currentUrl.includes('i/flow/login')) {
                    throw new Error('Not logged into Twitter');
                }
            }

            this.logger.info('Twitter login verified successfully');
            return true;
        } catch (error) {
            this.logger.error('Twitter login verification failed:', error.message);
            throw error;
        }
    }

    async executeTask(page, task) {
        try {
            this.logger.info(`Executing task: ${task.action}`);
            
            let result;
            switch (task.action) {
                case 'like':
                    result = await LikeAction.execute(page, task.tweetUrl);
                    break;
                case 'retweet':
                    result = await RetweetAction.execute(page, task.tweetUrl);
                    break;
                case 'follow':
                    result = await FollowAction.execute(page, task.username);
                    break;
                case 'tweet':
                    result = await TweetAction.execute(page, task.text);
                    break;
                case 'quote':
                    result = await QuoteAction.execute(page, task.tweetUrl, task.text);
                    break;
                default:
                    throw new Error(`Unknown action: ${task.action}`);
            }

            this.logger.info(`Task completed: ${task.action} - ${result.message}`);
            return { success: true, action: task.action, result };
        } catch (error) {
            this.logger.error(`Task failed: ${task.action} - ${error.message}`);
            return { success: false, action: task.action, error: error.message };
        }
    }

    async runTasks() {
        try {
            this.logger.info('🚀 Starting Twitter Task Runner...');
            console.log('==================================================');
            
            // Load tasks
            const tasks = await this.loadTasks();
            console.log(`📋 Loaded ${tasks.length} tasks`);
            
            // Fetch profiles
            const profiles = await this.fetchProfiles();
            console.log(`👥 Found ${profiles.length} profiles`);
            
            if (profiles.length === 0) {
                console.log('❌ No profiles found. Please create profiles in GoLogin first.');
                return;
            }
            
            console.log('==================================================\n');

            let totalTasks = 0;
            let successfulTasks = 0;
            let failedTasks = 0;

            for (const profile of profiles) {
                // Handle different profile formats
                let profileId;
                if (typeof profile === 'string') {
                    profileId = profile;
                } else if (profile && profile.id) {
                    profileId = profile.id;
                } else if (profile && profile._id) {
                    profileId = profile._id;
                } else {
                    this.logger.warn(`Skipping invalid profile: ${JSON.stringify(profile)}`);
                    continue;
                }
                
                console.log(`🔄 Processing profile: ${profileId}`);
                
                let browser = null;
                let context = null;
                let page = null;

                try {
                    // Launch profile
                    const browserData = await this.launchProfile(profileId);
                    browser = browserData.browser;
                    context = browserData.context;
                    page = browserData.page;

                    // Verify Twitter login
                    await this.verifyTwitterLogin(page);
                    console.log(`✅ Profile ${profileId} logged in successfully`);

                    // Execute all tasks
                    for (const task of tasks) {
                        totalTasks++;
                        console.log(`  📝 Executing: ${task.action}`);
                        
                        const result = await this.executeTask(page, task);
                        
                        if (result.success) {
                            successfulTasks++;
                            console.log(`    ✅ Success`);
                        } else {
                            failedTasks++;
                            console.log(`    ❌ Failed: ${result.error}`);
                        }

                        // Human-like delay between tasks (40-45 seconds)
                        if (task !== tasks[tasks.length - 1]) { // Don't delay after last task
                            console.log(`    ⏳ Waiting 40-45 seconds before next task...`);
                            await this.delay(40, 45);
                        }
                    }

                    console.log(`✅ Profile ${profileId} completed all tasks`);
                    
                } catch (error) {
                    console.log(`❌ Profile ${profileId} failed: ${error.message}`);
                    if (error.message.includes('Not logged into Twitter')) {
                        console.log(`💡 Please login to Twitter manually in this profile first`);
                    }
                } finally {
                    // Close browser
                    if (browser) {
                        try {
                            await browser.close();
                            this.logger.info(`Closed browser for profile: ${profileId}`);
                        } catch (e) {
                            this.logger.error(`Error closing browser for profile ${profileId}:`, e.message);
                        }
                    }
                }
                
                console.log(''); // Empty line for readability
            }

            // Display summary
            this.displaySummary(totalTasks, successfulTasks, failedTasks);
            
        } catch (error) {
            this.logger.error('Task runner failed:', error);
            console.error('❌ Task runner failed:', error.message);
        }
    }

    displaySummary(totalTasks, successfulTasks, failedTasks) {
        console.log('\n==================================================');
        console.log('📊 EXECUTION SUMMARY');
        console.log('==================================================');
        console.log(`📈 Total Tasks: ${totalTasks}`);
        console.log(`✅ Successful: ${successfulTasks}`);
        console.log(`❌ Failed: ${failedTasks}`);
        console.log(`📊 Success Rate: ${totalTasks > 0 ? ((successfulTasks / totalTasks) * 100).toFixed(1) : 0}%`);
        console.log('==================================================');
        console.log('🎉 Task execution completed!');
        console.log('==================================================');
    }

    async delay(minSeconds, maxSeconds) {
        const delayMs = Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds) * 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
}

async function main() {
    const runner = new TaskRunner();
    await runner.runTasks();
}

// Run the task runner
main();
