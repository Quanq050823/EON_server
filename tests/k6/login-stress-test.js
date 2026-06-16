import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "https://dattax.duckdns.org";
const LOGIN_ENDPOINT = __ENV.LOGIN_ENDPOINT || "/api/auth/login";
const LOGIN_EMAIL = __ENV.LOGIN_EMAIL;
const LOGIN_PASSWORD = __ENV.LOGIN_PASSWORD;
const LOGIN_URL = `${BASE_URL}${LOGIN_ENDPOINT}`;
const DEBUG_FAILURES = __ENV.DEBUG_FAILURES === "true";
const loginFailures = new Counter("login_failures");

if (!LOGIN_EMAIL || !LOGIN_PASSWORD) {
	throw new Error("Missing LOGIN_EMAIL or LOGIN_PASSWORD");
}

export const options = {
	stages: [
		{ duration: "30s", target: 5 },
		{ duration: "1m", target: 5 },
		{ duration: "30s", target: 20 },
		{ duration: "2m", target: 20 },
		{ duration: "30s", target: 0 },
	],
	thresholds: {
		http_req_failed: ["rate<0.05"],
		http_req_duration: ["p(95)<3000"],
	},
};

export default function () {
	http.cookieJar().clear(LOGIN_URL);

	const payload = JSON.stringify({
		email: LOGIN_EMAIL,
		password: LOGIN_PASSWORD,
	});

	const res = http.post(LOGIN_URL, payload, {
		headers: {
			"Content-Type": "application/json",
		},
	});

	if (res.status !== 200) {
		loginFailures.add(1);

		if (DEBUG_FAILURES && __ITER < 5) {
			console.log(`login failed: status=${res.status} body=${res.body}`);
		}
	}

	check(res, {
		"status is 200": (r) => r.status === 200,
		"has access token": (r) => Boolean(r.json("accessToken")),
		"has refresh token": (r) => Boolean(r.json("refreshToken")),
	});

	sleep(1);
}
