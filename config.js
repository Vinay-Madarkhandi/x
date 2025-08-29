import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // GoLogin Configuration
  gologin: {
    token: process.env.GOLOGIN_API_TOKEN
  },

  // Twitter Configuration
  twitter: {
    baseUrl: 'https://twitter.com',
    actionDelay: {
      min: 40000, // 40 seconds
      max: 45000  // 45 seconds
    },
    waitTimes: {
      pageLoad: 10000,
      elementWait: 10000,
      networkIdle: 3000
    }
  },

  // Automation Settings
  automation: {
    maxActionsPerSession: 50,
    sessionDelay: {
      min: 30000,
      max: 60000
    },
    actions: {
      like: true,
      retweet: true,
      follow: true,
      tweet: true,
      quote: true
    }
  },

  // Logging
  logging: {
    level: 'info', // 'debug', 'info', 'warn', 'error'
    saveScreenshots: false,
    saveTraces: false
  }
};

export function validateConfig() {
  if (!config.gologin.token || config.gologin.token.trim() === '') {
    throw new Error('GOLOGIN_API_TOKEN is required in environment variables');
  }
  return true;
}
