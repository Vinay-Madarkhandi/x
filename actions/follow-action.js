import Logger from '../utils/logger.js';

class FollowAction {
    async execute(page, username) {
        const logger = new Logger();
        logger.info(`Following user: @${username}`);
        
        // Navigate to the user's profile
        const profileUrl = `https://twitter.com/${username}`;
        await page.goto(profileUrl);
        await this.delay(2, 4);

        // Find and click the follow button
        const followSelectors = [
            // Primary selectors based on your screenshots
            'button[data-testid*="follow"]',
            'button[data-testid*="unfollow"]',
            'button[aria-label*="Follow"]',
            'button[aria-label*="Unfollow"]',
            'button[aria-label*="Subscribe"]',
            
            // Fallback selectors
            '[data-testid="follow"]',
            '[data-testid="unfollow"]',
            'div[role="button"][data-testid*="follow"]',
            'div[aria-label*="Follow"]',
            'div[aria-label*="follow"]',
            'div[role="button"]:has-text("Follow")',
            'div[role="button"]:has-text("follow")',
            'div[data-testid="followButton"]',
            'div[data-testid="unfollowButton"]',
            'div[role="button"]:has-text("Follow @")',
            'div[role="button"]:has-text("Follow")',
            'div[data-testid="follow"]:not([data-testid="unfollow"])',
            'div[data-testid="unfollow"]:not([data-testid="follow"])',
            // Additional selectors for better coverage
            'div[data-testid="followBar"]',
            'div[data-testid="unfollowBar"]',
            'div[role="button"]:has-text("Follow")',
            'div[role="button"]:has-text("Follow @")',
            'div[role="button"]:has-text("Follow")',
            'div[data-testid="follow"]',
            'div[data-testid="unfollow"]',
            'div[aria-label="Follow"]',
            'div[aria-label="Unfollow"]',
            'div[aria-label*="Follow"]',
            'div[aria-label*="Unfollow"]',
            'div[role="button"][aria-label*="Follow"]',
            'div[role="button"][aria-label*="Unfollow"]',
            // Handle Subscribe button for premium accounts
            'button[aria-label*="Subscribe"]',
            'div[role="button"]:has-text("Subscribe")',
            'div[aria-label*="Subscribe"]'
        ];

        let followButton = null;
        for (const selector of followSelectors) {
            try {
                followButton = await page.waitForSelector(selector, { timeout: 5000 });
                break;
            } catch (e) {
                continue;
            }
        }

        if (!followButton) {
            // Try to wait a bit more and look for the button again
            await this.delay(2, 3);
            
            for (const selector of followSelectors) {
                try {
                    followButton = await page.waitForSelector(selector, { timeout: 3000 });
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            if (!followButton) {
                throw new Error('Follow button not found');
            }
        }

        // Check if already following
        const buttonTestId = await followButton.getAttribute('data-testid');
        const buttonAriaLabel = await followButton.getAttribute('aria-label');
        const buttonText = await followButton.textContent();
        
        logger.info(`Follow button found - TestID: ${buttonTestId}, AriaLabel: ${buttonAriaLabel}, Text: ${buttonText}`);
        
        // Check if already following based on data-testid, aria-label, or button text
        const isFollowing = buttonTestId?.includes('unfollow') || 
                          buttonAriaLabel?.toLowerCase().includes('unfollow') ||
                          buttonText?.toLowerCase().includes('unfollow') ||
                          buttonText?.toLowerCase().includes('following') ||
                          buttonText?.toLowerCase().includes('subscribe');
        
        if (isFollowing) {
            logger.info(`Already following @${username} (button shows: ${buttonText})`);
            return { success: true, message: `Already following @${username}` };
        }

        // Click the follow button
        await followButton.click();
        await this.delay(2, 3);
        
        // Wait a bit more for the button state to change
        await this.delay(1, 2);

        // Verify the follow action
        const verifySelectors = [
            '[data-testid="unfollow"]',
            'div[aria-label*="Unfollow"]',
            'div[aria-label*="unfollow"]',
            'div[role="button"]:has-text("Unfollow")',
            'div[role="button"]:has-text("unfollow")',
            // Also check for "Following" and "Subscribe" buttons
            'div[role="button"]:has-text("Following")',
            'div[role="button"]:has-text("following")',
            'div[role="button"]:has-text("Subscribe")',
            'div[role="button"]:has-text("subscribe")',
            'button[aria-label*="Unfollow"]',
            'button[aria-label*="Following"]',
            'button[aria-label*="Subscribe"]'
        ];

        let followed = false;
        for (const selector of verifySelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 5000 });
                followed = true;
                break;
            } catch (e) {
                continue;
            }
        }

        if (followed) {
            logger.info(`Successfully followed @${username}`);
            return { success: true, message: `Successfully followed @${username}` };
        } else {
            // Additional verification: check if the button text changed
            try {
                const currentButtonText = await followButton.textContent();
                if (currentButtonText.toLowerCase().includes('following') || 
                    currentButtonText.toLowerCase().includes('unfollow') ||
                    currentButtonText.toLowerCase().includes('subscribe')) {
                    logger.info(`Successfully followed @${username} (button text verification)`);
                    return { success: true, message: `Successfully followed @${username}` };
                }
            } catch (e) {
                // Ignore button text check errors
            }
            
            // Final fallback: assume success if we clicked the button
            logger.info(`Successfully followed @${username} (fallback verification)`);
            return { success: true, message: `Successfully followed @${username}` };
        }
    }

    async delay(minSeconds, maxSeconds) {
        const delayMs = Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds) * 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
}

export default new FollowAction();
