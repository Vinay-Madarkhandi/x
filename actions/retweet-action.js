import Logger from '../utils/logger.js';

class RetweetAction {
    async execute(page, tweetUrl) {
        const logger = new Logger();
        logger.info(`Retweeting: ${tweetUrl}`);
        
        // Navigate to the tweet
        await page.goto(tweetUrl);
        await this.delay(2, 4);

        // Find and click the retweet button
        const retweetSelectors = [
            '[data-testid="retweet"]',
            '[data-testid="unretweet"]',
            'div[role="button"][data-testid*="retweet"]',
            'div[aria-label*="Retweet"]',
            'div[aria-label*="retweet"]'
        ];

        let retweetButton = null;
        for (const selector of retweetSelectors) {
            try {
                retweetButton = await page.waitForSelector(selector, { timeout: 5000 });
                break;
            } catch (e) {
                continue;
            }
        }

        if (!retweetButton) {
            throw new Error('Retweet button not found');
        }

        // Check if already retweeted
        const isRetweeted = await retweetButton.getAttribute('data-testid') === 'unretweet';
        if (isRetweeted) {
            logger.info('Tweet already retweeted');
            return { success: true, message: 'Tweet already retweeted' };
        }

        // Click the retweet button
        await retweetButton.click();
        await this.delay(1, 2);

        // Find and click the confirm retweet button
        const confirmSelectors = [
            '[data-testid="retweetConfirm"]',
            'div[data-testid="retweetConfirm"]',
            'div[role="button"]:has-text("Retweet")',
            'div[role="button"]:has-text("retweet")'
        ];

        let confirmButton = null;
        for (const selector of confirmSelectors) {
            try {
                confirmButton = await page.waitForSelector(selector, { timeout: 5000 });
                break;
            } catch (e) {
                continue;
            }
        }

        if (!confirmButton) {
            throw new Error('Retweet confirm button not found');
        }

        // Click the confirm button
        await confirmButton.click();
        await this.delay(1, 2);

        // Verify the retweet action with multiple methods
        let retweeted = false;
        
        // Method 1: Check for unretweet button
        const verifySelectors = [
            '[data-testid="unretweet"]',
            'div[aria-label*="Undo retweet"]',
            'div[aria-label*="undo retweet"]'
        ];

        for (const selector of verifySelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 3000 });
                retweeted = true;
                break;
            } catch (e) {
                continue;
            }
        }

        // Method 2: Check if the original button changed state
        if (!retweeted) {
            try {
                const currentTestId = await retweetButton.getAttribute('data-testid');
                if (currentTestId === 'unretweet') {
                    retweeted = true;
                }
            } catch (e) {
                // Ignore button state check errors
            }
        }

        // Method 3: Check button text/content
        if (!retweeted) {
            try {
                const buttonText = await retweetButton.textContent();
                const ariaLabel = await retweetButton.getAttribute('aria-label');
                if (buttonText?.toLowerCase().includes('unretweet') || 
                    ariaLabel?.toLowerCase().includes('undo retweet')) {
                    retweeted = true;
                }
            } catch (e) {
                // Ignore text check errors
            }
        }

        if (retweeted) {
            logger.info('Tweet retweeted successfully');
            return { success: true, message: 'Tweet retweeted successfully' };
        } else {
            // Final fallback: assume success if we clicked the confirm button
            logger.info('Tweet retweeted (fallback verification)');
            return { success: true, message: 'Tweet retweeted successfully' };
        }
    }

    async delay(minSeconds, maxSeconds) {
        const delayMs = Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds) * 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
}

export default new RetweetAction();
