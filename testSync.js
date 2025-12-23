import { syncInvoicesFromGDT } from "./src/services/invoiceSyncService.js";

const testUsername = "0310711010";
const testPassword = "AtbU1aA@";
const testCaptcha = "YOUR_CAPTCHA_VALUE";

async function runTest() {
	const result = await syncInvoicesFromGDT(
		testUsername,
		testPassword,
		testCaptcha
	);
	console.log("Resutl:", result);
}
runTest();
