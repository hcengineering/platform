import { test as baseTest } from '@playwright/test';
import RecruitPage from '../web/pages/authorizedPages/recruitPage';
import AuthorizedMainPage from '../web/pages/basePages/authorizedMainPage';

type pages = {
    authorizedMainPage: AuthorizedMainPage;
    recruitPage: RecruitPage;
}

const allPages = baseTest.extend<pages, { workerStorageState: string }>({
    authorizedMainPage: async ({ page }, use) => {
        await use(new AuthorizedMainPage(page));
    },

    recruitPage: async ({ page }, use) => {
        await use(new RecruitPage(page));
    },

    storageState: ({ workerStorageState }, use) => use(workerStorageState),

    workerStorageState: [async ({ browser }, use) => {
        // Multi-user authorization will be added
        // Use parallelIndex as a unique identifier for each worker.
        // const id = test.info().parallelIndex;
        // const fileName = path.resolve(__dirname, `auth_temp/${id}.json`);

        // if (fs.existsSync(fileName)) {
        //     // Reuse existing authentication state if any.
        //     await use(fileName);
        //     return;
        // }

        // const page = await browser.newPage({ storageState: undefined });
        // const account = await acquireAccount(id);
    }, { scope: 'worker' }],
}
);

export const test = allPages;
export const expect = allPages.expect;
