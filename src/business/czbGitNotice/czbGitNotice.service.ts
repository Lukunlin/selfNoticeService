import { Injectable } from "@nestjs/common"

@Injectable()
export class CzbGitNoticeService {
	pushNotice() {
		return "Hi, my friend"
	}
}
