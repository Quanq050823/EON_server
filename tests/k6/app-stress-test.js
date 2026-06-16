import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "https://dattax.duckdns.org";
const ENDPOINT = __ENV.ENDPOINT || "/";

export const options = {
	stages: [
		{ duration: "1m", target: 50 },
		{ duration: "3m", target: 50 },
		{ duration: "1m", target: 100 },
		{ duration: "3m", target: 100 },
		{ duration: "1m", target: 0 },
	],
	thresholds: {
		http_req_failed: ["rate<0.05"],
		http_req_duration: ["p(95)<3000"],
	},
};

export default function () {
	const res = http.get(`${BASE_URL}${ENDPOINT}`);

	check(res, {
		"status is 200": (r) => r.status === 200,
		"app is running": (r) => r.json("status") === "ok",
	});

	sleep(1);
}
