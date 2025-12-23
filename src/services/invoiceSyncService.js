import puppeteer from "puppeteer";

const GDT_URL = "https://hoadondientu.gdt.gov.vn/";
const SELECTORS = {
	menuButton: "button.ant-btn.ant-btn-lg.ant-btn-icon-only",
	loginMenuItem:
		'xpath/.//*[contains(@class, "header-item")]//span[contains(text(), "Đăng nhập")]',
	username: "#username",
	password: "#password",
	captchaInput: 'input[id="cvalue"]',
	loginButton: 'button[type="submit"].ant-btn-primary',
};

const browserSessions = new Map();

async function getCaptchaImage(sessionId, username, password) {
	let browser;
	try {
		browser = await puppeteer.launch({
			headless: false,
			slowMo: 20,
			args: [
				"--no-sandbox",
				"--disable-setuid-sandbox",
				"--disable-dev-shm-usage",
				"--disable-gpu",
			],
		});
		const page = await browser.newPage();
		await page.setDefaultTimeout(60000);

		await page.goto(GDT_URL, { waitUntil: "domcontentloaded" });
		await page.keyboard.press("Escape");

		await page.waitForSelector(SELECTORS.menuButton);
		await page.click(SELECTORS.menuButton);

		const loginElement = await page.waitForSelector(SELECTORS.loginMenuItem);
		await loginElement.click();

		console.log("Đang điền username và password...");
		await page.waitForSelector(SELECTORS.username);
		await page.type(SELECTORS.username, String(username));
		await page.type(SELECTORS.password, String(password));

		await page.waitForSelector('img[alt="captcha"][class*="Captcha__Image"]', {
			timeout: 10000,
		});

		try {
			const refreshButton = await page.$(
				'button[aria-label*="reload"], span[aria-label*="reload"], button[title*="Tạo lại"], span[class*="reload"]'
			);
			if (refreshButton) {
				await refreshButton.click();
				await new Promise((resolve) => setTimeout(resolve, 1500));
			}
		} catch (error) {}

		const captchaImgs = await page.$$(
			'img[alt="captcha"][class*="Captcha__Image"]'
		);
		const captchaImg = captchaImgs[captchaImgs.length - 1];

		await page.waitForFunction(
			(img) => {
				return img.src && img.src.startsWith("data:image") && img.complete;
			},
			{ timeout: 10000 },
			captchaImg
		);

		await new Promise((resolve) => setTimeout(resolve, 500));

		const captchaSrc = await page.evaluate((img) => img.src, captchaImg);

		browserSessions.set(sessionId, { browser, page });

		return {
			success: true,
			captchaImage: captchaSrc,
			message: "Đã lấy captcha thành công",
		};
	} catch (error) {
		if (browser) {
			await browser.close();
		}
		return { success: false, error: error.message };
	}
}

async function loginWithCaptcha(
	sessionId,
	captcha,
	startDate,
	invoiceType = "input"
) {
	try {
		const session = browserSessions.get(sessionId);

		if (!session) {
			throw new Error("Session không tồn tại hoặc đã hết hạn");
		}

		const { page } = session;

		await page.waitForFunction(
			(selector) => document.querySelectorAll(selector).length >= 2,
			{},
			SELECTORS.captchaInput
		);

		const captchaInputs = await page.$$(SELECTORS.captchaInput);
		if (captchaInputs.length >= 2) {
			const lastCaptchaInput = captchaInputs[captchaInputs.length - 1];
			await lastCaptchaInput.click();
			await lastCaptchaInput.type(String(captcha));
			console.log("Đã điền captcha thành công");
		} else {
			throw new Error("Không tìm thấy input captcha");
		}
		console.log("Đang nhấn nút đăng nhập...");
		const loginButtons = await page.$$(SELECTORS.loginButton);
		if (loginButtons.length >= 2) {
			await loginButtons[1].click();
		} else {
			throw new Error("Không tìm thấy nút đăng nhập thứ 2");
		}

		const traCuuElement = await page.waitForSelector(
			'xpath/.//span[contains(text(), "Tra cứu")]',
			{
				timeout: 1000000,
			}
		);
		await traCuuElement.click();

		const traCuuHoaDonElement = await page.waitForSelector(
			'xpath/.//a[contains(text(), "Tra cứu hóa đơn")]',
			{
				timeout: 1000000,
			}
		);
		await traCuuHoaDonElement.click();

		// Chọn loại hóa đơn dựa vào invoiceType
		const invoiceMenuText =
			invoiceType === "output"
				? "Hóa đơn có mã khởi tạo từ máy tính tiền"
				: "Tra cứu hóa đơn điện tử mua vào";

		const traCuuHoaDonDTMVElement = await page.waitForSelector(
			`xpath/.//span[contains(text(), "${invoiceMenuText}")]`,
			{
				timeout: 1000000,
			}
		);
		await traCuuHoaDonDTMVElement.click();

		console.log("Đang cập nhật calendar picker...");
		if (startDate) {
			await page.waitForSelector("input.ant-calendar-picker-input", {
				timeout: 10000,
			});
			const calendarInputs = await page.$$("input.ant-calendar-picker-input");
			const calendarIndex = invoiceType === "output" ? 0 : 2;
			await calendarInputs[calendarIndex].click();
			await page.waitForSelector("input.ant-calendar-input", {
				timeout: 5000,
			});
			// Focus vào input trong calendar popup
			await page.focus("input.ant-calendar-input");
			await new Promise((resolve) => setTimeout(resolve, 300));

			// Clear và điền giá trị mới
			await page.evaluate(() => {
				const input = document.querySelector("input.ant-calendar-input");
				if (input) {
					input.value = "";
				}
			});

			await page.type("input.ant-calendar-input", String(startDate), {
				delay: 100,
			});
			console.log("Đã điền startDate:", startDate);

			// Nhấn Enter để apply
			await new Promise((resolve) => setTimeout(resolve, 500));
			await page.keyboard.press("Enter");

			// Đợi calendar đóng
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		// Tìm và click vào nút "Tìm kiếm" thứ 3
		console.log("Đang tìm nút Tìm kiếm...");
		await page.waitForSelector('xpath/.//span[contains(text(), "Tìm kiếm")]', {
			timeout: 10000,
		});
		const searchButtons = await page.$$(
			'xpath/.//span[contains(text(), "Tìm kiếm")]'
		);

		// Click và đợi API response
		console.log(
			`Đang click nút Tìm kiếm... (tìm thấy ${searchButtons.length} nút)`
		);
		console.log("Đang setup listener cho API...");

		let invoicesData = null;

		// Xác định endpoint dựa vào invoiceType
		const apiEndpoint =
			invoiceType === "output"
				? "/sco-query/invoices/sold"
				: "/query/invoices/purchase";

		// Setup listener để bắt response
		const apiDataPromise = new Promise((resolve) => {
			page.on("response", async (response) => {
				const url = response.url();
				const method = response.request().method();
				const status = response.status();

				// Chỉ bắt request GET chính, bỏ qua preflight OPTIONS
				if (url.includes(apiEndpoint) && method === "GET" && status === 200) {
					console.log(`Đã phát hiện API call (${invoiceType}):`, url);
					console.log(`Method: ${method}, Status: ${status}`);

					try {
						// Đợi một chút để đảm bảo response đã hoàn tất
						await new Promise((r) => setTimeout(r, 5000));

						const text = await response.text();
						if (!text || text.trim() === "") {
							console.log("Response body rỗng, bỏ qua...");
							return;
						}

						const data = JSON.parse(text);
						console.log(
							"Đã lấy response body, số lượng items:",
							data?.content?.length || 0
						);
						resolve(data);
					} catch (error) {
						console.error("Lỗi khi xử lý response:", error.message);
						// Không resolve(null) ở đây, để timeout xử lý
					}
				}
			});

			// Timeout sau 30s
			setTimeout(() => {
				console.log("Timeout: Không nhận được API response sau 30s");
				resolve(null);
			}, 30000);
		});

		// Click nút tìm kiếm
		const searchIndex = invoiceType === "output" ? 0 : 1;
		await searchButtons[searchIndex].click();

		// Đợi data
		invoicesData = await apiDataPromise;
		return {
			success: true,
			message: "Đã truy cập Tra cứu thành công",
			invoices: invoicesData,
		};
	} catch (error) {
		return { success: false, error: error.message };
	} finally {
		const session = browserSessions.get(sessionId);
		if (session) {
			await session.browser.close();
			browserSessions.delete(sessionId);
		}
	}
}

export { getCaptchaImage, loginWithCaptcha };
export default { getCaptchaImage, loginWithCaptcha };
