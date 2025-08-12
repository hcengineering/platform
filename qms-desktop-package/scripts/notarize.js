require('dotenv').config();
const { notarize } = require('@electron/notarize');

async function retryNotarize(options, retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempt ${i + 1} to notarize...`);
      await notarize(options);
      console.log('Notarization successful');
      return;
    } catch (error) {
      console.error(`Notarization attempt ${i + 1} failed:`, error);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Increase delay for the next retry
      } else {
        console.log('All notarization attempts failed...');
        // Add any necessary teardown logic here
        throw error;
      }
    }
  }
}

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;  
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  console.log('Starting custom notarization process...');
  await retryNotarize({
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_ID_APP_PASS,
    teamId: process.env.TEAM_ID
  });
};
