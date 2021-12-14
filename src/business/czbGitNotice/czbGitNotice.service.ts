import { Injectable } from "@nestjs/common"

@Injectable()
export class CzbGitNoticeService {
	async pushNotice(body) {
		return "Hi, my friend"
	}
}
