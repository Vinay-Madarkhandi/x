import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Logger {
  constructor(level = config.logging.level, saveScreenshots = config.logging.saveScreenshots, saveTraces = config.logging.saveTraces) {
    this.level = level;
    this.saveScreenshots = saveScreenshots;
    this.saveTraces = saveTraces;
    this.logsDir = path.join(__dirname, '..', 'logs');
    this.screenshotsDir = path.join(this.logsDir, 'screenshots');
    this.tracesDir = path.join(this.logsDir, 'traces');
    
    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.logsDir, { recursive: true });
      await fs.mkdir(this.screenshotsDir, { recursive: true });
      await fs.mkdir(this.tracesDir, { recursive: true });
    } catch (error) {
      console.error('Error creating log directories:', error);
    }
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  log(level, message, data = null) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[this.level] || 1;
    const messageLevel = levels[level] || 1;

    if (messageLevel >= currentLevel) {
      const timestamp = this.getTimestamp();
      const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
      
      console.log(logMessage);
      if (data) {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  }

  debug(message, data = null) {
    this.log('debug', message, data);
  }

  info(message, data = null) {
    this.log('info', message, data);
  }

  warn(message, data = null) {
    this.log('warn', message, data);
  }

  error(message, data = null) {
    this.log('error', message, data);
  }

  async saveScreenshot(page, filename) {
    if (!this.saveScreenshots) return;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = path.join(this.screenshotsDir, `${filename}_${timestamp}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      this.info(`Screenshot saved: ${screenshotPath}`);
    } catch (error) {
      this.error('Failed to save screenshot:', error);
    }
  }

  async saveTrace(context, filename) {
    if (!this.saveTraces) return;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const tracePath = path.join(this.tracesDir, `${filename}_${timestamp}.zip`);
      await context.tracing.stop({ path: tracePath });
      this.info(`Trace saved: ${tracePath}`);
    } catch (error) {
      this.error('Failed to save trace:', error);
    }
  }

  async logAction(profileId, action, success, details = null) {
    const logEntry = {
      timestamp: this.getTimestamp(),
      profileId,
      action,
      success,
      details
    };

    this.info(`Action completed: ${action}`, logEntry);
  }
}

export default Logger;
